# Taktický rozbor a prohloubení Mise 3 (`Doutnák` — Prachový dvůr u Čertovky)

Tento dokument navazuje na obecné principy taktického designu tahových her z `docs/design/mission-2-mriz-tactical-design.md` (*XCOM 2*, *Into the Breach*, *Invisible, Inc.*, *Shadow Tactics*, *Gears Tactics*) a aplikuje je na Misi 3 (`Doutnák`, noc z 27. na 28. července 1648, viz `docs/adr/0019-matchcord-sortie-at-the-powder-yard.md` a `docs/design/mission-3-doutnak.md`).

---

## 1. Analýza z prvních principů: Jaké taktické napětí definuje Misi 3?

Mise 3 je postavena jako **noční diverzní výpad se třemi protiběžnými hodinami a fází utajení (*Stealth-to-Loud Sabotage & Extraction*)**:

1. **Hodiny A — Tři prachové káry (`deliveries: 0..3`)**: Každý švédský tah (`openSwedishTurn`) posune nosič (`enemy-bearer-N`) káru z `(16, 0, 8)` do brány baterie `(17, 0, 8)`. Jakmile projede třetí kára dříve, než vybuchne sklad (`cookOff`), výsadek prohrává (`loss: "delivery"`).
2. **Hodiny B — Voskovaný doutnák a postup jiskry (`cord`, `sparkIndex`, `SPARK_STEP = 2`)**: Doutnák musí být fyzicky položen po souvislých prázdných dlaždicích do dveří skladu `STORE_DOOR = (12, 0, 10)` a zapálen Jiřím Plachým (`lightCord`). Na konci každého hráčova tahu (`closePlayerTurn`) jiskra přeskočí o 2 články kupředu.
3. **Hodiny C — Kartáčový kužel falkonetu (`cone: "lane" | "court" | "cord"`) a zašlápnutí jiskry (`writeStamp` / `applyStamp`)**: Jakmile padne ticho, dělmistr (`enemy-gunner` na `(17, 0, 12)`) u hlavně falkonetu `MUZZLE = (17, 0, 10)` v prvním švédském tahu telegrafuje kužel (`coneWarned = true`) a v každém dalším tahu vypálí kartáč (`7 HP`, stržení `1` zbroje, otřesení, poškození dlažby). Současně švédské hlídky hrozí zašlápnutím hořící jiskry.

### Diagnostika slabých míst původní implementace Mise 3

Přestože základní hodinový stroj Mise 3 fungoval deterministicky, v živém taktickém hraní vykazoval čtyři omezení:

1. **Nezastavitelný „duchovní“ falkonet bez aktivní protihry**:
   - V `closeSwedishTurn` falkonet vypálil kartáčový kužel v každém kole po varování **bez ohledu na to, zda byl dělmistr (`enemy-gunner`) naživu**, a obránci neměli žádnou specializovanou akci, jak telegrafovaný výstřel falkonetu zmařit či odložit (kromě pasivního schování za pilíř `(15, 0, 10)` nebo `(11, 0, 13)`).
2. **Chybějící směrové krytí v zápalném výklenku a na severním zábradlí lodžie**:
   - Zápalný výklenek `(9, 0, 11)` (odkud Plachý zapaluje doutnák) měl sice plný kryt na východ od zdi `(10, 0, 11)`, ale **nulový kryt na jih a západ**, odkud pálí obě švédské stráže `(12, 0, 13)`, `(15, 0, 14)` i západní posily `(8, 0, 14..15)`.
   - Stejně tak krytá lodžie v 1. patře (`y = 1, x: 8..15, z = 12`) měla v `evalRoofParapetCover` poloviční kryt pouze směrem na jih (`dir === "S"`), ale chyběl jí kryt zábradlí směrem na sever (`dir === "N"`) do dvora a k dráze kár.
3. **Absence výbušného ohniska v jižní části dvora**:
   - Jediný prachový sud na mapě vznikl až ve chvíli, kdy Ondřej z lodžie přeřízl postraňky káry na `(16, 0, 8)` (nebo když padl nosič). V jižní části dvora (`z: 13..15`), kudy nastupují posily z `RELIEF_SOUTH = (12, 0, 15)` a kde stojí `enemy-sentry-1` na `(12, 0, 13)`, chyběl environmentální prvek (*Pillar D*), který by odměnil střelbu z lodžie či hod petardou.
4. **Slepá AI švédských lovců vůči hořící jiskře a koridoru doutnáku**:
   - `computeMission3Ai` volala pouze obecnou funkci `computeEnemyAiDecision(grid, enemy, units, "rain")`. Švédští střelci tak nikdy cíleně nekročili k hořící jiskře, aby aktivovali hrozbu zašlápnutí (`writeStamp`), a naopak mohli náhodně zastavit přímo na ose doutnáku `z = 10` (`x: 9..12`), čímž by pasivně zablokovali položení dalšího článku.

---

## 2. Konkrétní taktická a architektonická vylepšení Mise 3 (`Doutnák`)

Všechny úpravy jsou navrženy tak, aby **100% zachovaly stávající kanonické invarianty a průchody** v `scripts/test-mission3.ts` (`No-Ondřej Turn-1 Victory`, `Skiff-Wait Loss`, `Ondřej Buy-Back Victory`) a současně otevřely novou vrstvu taktických rozhodnutí.

### 2.1 Protibaterijní akce: Zmaření zážehu falkonetu (`canDisruptFalconet`, `applyDisruptFalconet`) a vazba na dělmistra
- **Fyzická vazba falkonetu na dělmistra (`GUNNER_ID = "enemy-gunner"`)**:
  - V `closeSwedishTurn` falkonet střílí a zaměřuje kužel **pouze tehdy, je-li dělmistr bojeschopný** (`!gunner || isUnitFighting(gunner)`). Pokud výsadek dělmistra na `(17, 0, 12)` zlikviduje, dělo utichne (`cone: null, coneWarned: false, coneFired: false`).
- **Nová taktická akce „Zhatit zážeh děla, 1 AP“ (`disruptMission3Falconet`)**:
  - **Kdy je dostupná (`canDisruptFalconet`)**: Falkonet právě telegrafuje výstřel (`!clock.silent && !clock.cookedOff && clock.coneWarned && clock.cone !== null`), dělmistr žije a vybraný obránce stojí buď:
    1. **Ve východní části kryté lodžie (`y = 1, x >= 12, z: 12..14`)** s přímým 3D průhledem (`checkLineOfSight3D`) na ústí hlavně `MUZZLE = (17, 0, 10)` nebo dělmistra `(17, 0, 12)`, NEBO
    2. **Ve východní části dvora (`y = 0, x >= 13`) či v přímém sousedství (`Chebyshev <= 1`)** hlavně `MUZZLE` / dělmistra s přímým průhledem.
  - **Mechanický efekt (`applyDisruptFalconet`, cena `1 AP`)**:
    - Srazí dělmistrův hořící lunt (*doutnákovou hůl*), okamžitě zruší zaměřený kartáčový kužel (`cone: null, coneWarned: false, coneFired: false`) a uvrhne dělmistra do stavu otřesení (`isShaken: true`).
    - V nadcházejícím švédském tahu tak falkonet **nemůže vystřelit** a dělmistr musí celý tah strávit novým zaměřením a telegrafováním kužele (`coneWarned: true, coneFired: false`).
  - **Taktické dilema na lodžii (*Pillar A & B*)**:
    - Střelec na lodžii (typicky Ondřej po výstupu po laně `(8, 0, 12) -> (8, 1, 12)`) musí v každém kole volit, jak naloží se svými `2 AP`:
      - *Možnost 1*: Přeříznout postraňky káry (`cutTackle`, `1 AP`) a zastavit odpočet kár (`deliveries`).
      - *Možnost 2*: Zhatit zážeh falkonetu (`disruptMission3Falconet`, `1 AP`) a zachránit Plachého s Havlem v koridoru doutnáku `(9..12, 0, 10)` před `7 HP` kartáčovou salvou.
      - *Možnost 3*: Vystřelit z karabiny na prachový sud či švédského střelce u jiskry (`1 AP`, ukončuje tah).

### 2.2 Pohotovostní prachový sud v jižním dvoře (`COURTYARD_KEG = { x: 13, y: 0, z: 14 }`)
- Na dlaždici `(13, 0, 14)` pod jižním okrajem lodžie je umístěn pohotovostní prachový sud (`obstacle: "powder_keg"`):
  - **Prostorová návaznost**: Leží v zóně $3 \times 3$ (`x: 12..14, z: 13..15`), která přímo zasahuje výchozí postavení `enemy-sentry-1` na `(12, 0, 13)` a současně pokrývá vnitřní nástupní prostor jižních vrat posil `RELIEF_SOUTH = (12, 0, 15)` a `RELIEF_INNER_SOUTH = (12, 0, 14)`.
  - **Bezpečnost vůči kartáči**: Žádný ze tří kuželů falkonetu (`"lane"`, `"court"`, `"cord"`) nedosahuje na $z = 14$, takže dělmistr sud nikdy neodpálí omylem sám.
  - **Taktická páka (*Pillar D*)**: Pokud Ondřej z lodžie přeřízne postraňky (`cutTackle`), švédské posily vtrhnou právě jižními vraty `(12, 0, 14..15)`. Jediný výstřel nebo petarda do `COURTYARD_KEG` na `(13, 0, 14)` smete stráž i obě posily tlakovou vlnou (`displaceFromPowderBlast`) a zahalí jižní dvůr hustým dýmem.

### 2.3 Směrové mikro-kryty v zápalném výklenku, u paty schodů a na lodžii (`evalRoofParapetCover`)
- V `GridSystem.evalRoofParapetCover` (`kind === "powder-yard"`) jsou definovány trvalé poloviční kryty (`"half"`, $-20\text{ \%}$ k zásahu nepřítele), které přežívají i přepočet krytů při otevření vrat posil (`setDoorState` $\to$ `bakeCoverFromObstacles`):
  1. **Severní i jižní zábradlí lodžie (`y = 1, z = 12, x: 8..15`)**: `N: "half"`, `S: "half"` (plus boční zábradlí `W: "half"` na $x = 8$ a `E: "half"` na $x = 15$).
  2. **Zápalný výklenek `(9, 0, 11)`**: `S: "half"`, `W: "half"` (spolu s plným krytem `E: "full"` od zdi `(10, 0, 11)` chrání Plachého při zapalování doutnáku proti palbě ze dvora).
  3. **Ústí doutnákového koridoru a přístup k lanu `(8, 0, 10)` a `(8, 0, 11)`**: `S: "half"`, `E: "half"`.
  4. **Patník u paty schodiště `(10, 0, 12)` a středový kamenný blok `(13, 0, 12)`**: `S: "half"`, `E: "half"`.

### 2.4 Adaptivní AI švédských lovců (`computeMission3Ai`) — Tlak na jiskru a disciplína koridoru
- Po skončení varovného tahu (`clock.coneWarned === true`) švédští lovci (`enemy-sentry-1..2`, `enemy-relief-1..2`, odpojení nosiči) vyhodnocují bojiště ve dvou taktických vrstvách:
  1. **Aktivní lov jiskry z jižního boku (`z >= 11`)**: Pokud doutnák hoří (`clock.lit && !clock.cookedOff`) a u aktivní jiskry `cord[sparkIndex]` ještě nestojí žádný švédský voják (`clock.stamperIds.length === 0`), lovec v dosahu `1 AP` prioritně obsadí pole na jižním boku `z >= 11` sousedící s jiskrou (např. `(8, 0, 11)` nebo `(9, 0, 11)`), čímž na konci švédského tahu aktivuje hrozbu zašlápnutí (`writeStamp`) a zároveň z nové pozice vystřelí.
  2. **Zákaz pasivního ucpání doutnákového koridoru `(9..12, 0, 10)`**: Dokud sklad nevybuchl (`!clock.cookedOff`), AI nikdy neukončí svůj pohyb na dlaždicích samotného koridoru doutnáku `z = 10, x: 9..12`, ale vždy volí boční palebnou pozici na `z >= 11`. Tím vytváří autentický palebný a kontaktní tlak z boku, aniž by uměle znemožnila položení doutnáku.

---

## 3. Matice taktických rolí a rozhodnutí v Misi 3 (`Doutnák`)

| Jednotka výsadku | Primární prostorová vrstva | Unikátní taktické páky a rozhodnutí |
| :--- | :--- | :--- |
| **Jiří Plachý** (`player-plachy`, VIP) | Přístaviště `(6, 0, 9)` $\leftrightarrow$ Zápalný výklenek `(9, 0, 11)` | Jediný nese křesadlo (`lightCord`, `1 AP`). Ve výklenku `(9, 0, 11)` je krytý zdí z východu (`full`) a obrubníkem z jihu/západu (`half`). Po zážehu skladu (`cookOff`) se musí probít kouřem zpět na pramici `(6, 0, 9..10)`. |
| **Ondřej** (`player-ondrej`, Střelec) | Koridor doutnáku `(8..12, 0, 10)` $\leftrightarrow$ Krytá lodžie (`y = 1, z: 12..14`) | Klade **2 články doutnáku za 1 AP**; po laně `(8, 0, 12)` vyšplhá na lodžii za **1 přechod kola**. Z východní lodžie (`x >= 12`) řídí celé bojiště: přeřezává postraňky (`cutTackle`), maří zážeh falkonetu (`disruptMission3Falconet`) a odpaluje sudy `(16, 0, 8)` i `(13, 0, 14)`. |
| **Havel Řezáč** (`player-havel`, Sekáč) | Koridor doutnáku $\leftrightarrow$ Střední a východní dvůr (`x: 9..16, z: 10..14`) | Má `6` polí pohybu za `1 AP` (`movePerAp: 6` mimo dým). Jako těžký tělesný strážce doutnáku odhání švédské šlapače ztečí zblízka (`displaceFromMelee` odstrčí nepřítele o 1 pole od jiskry!), klade zbývající články ke dveřím skladu `(12, 0, 10)` a z východního dvora (`x >= 13`) může rovněž zhatit zážeh falkonetu. |

---

## 4. Ošetření rizik a okrajových případů (Failure Modes & Invariants)

1. **Zachování kanonických průchodů v `scripts/test-mission3.ts`**:
   - *Riziko*: Změna AI nebo přidání překážky by mohlo narušit 3 kanonické linie (`No-Ondřej Turn-1 Victory`, `Skiff-Wait Loss`, `Ondřej Buy-Back Victory`).
   - *Ošetření*: `COURTYARD_KEG` na `(13, 0, 14)` stojí mimo všechny 3 kartáčové kužely i mimo trasy kanonických linií. V `computeMission3Ai` filtr `!isCordCorridorTile(r.coord)` garantuje, že žádný švédský voják během `ST2` nevstoupí na `(10, 0, 10)`, `(11, 0, 10)` ani `(12, 0, 10)`.
2. **Odolnost krytů při otevření vrat posil (`bakeCoverFromObstacles`)**:
   - *Riziko*: Při prolomení ticha (`breakSilence`) volá `grid.setDoorState(door, "open")` metodu `bakeCoverFromObstacles()`, která by přepsala ručně nastavené kryty.
   - *Ošetření*: Směrové kryty výklenku `(9, 0, 11)`, ústí `(8, 0, 10..11)`, paty schodů `(10, 0, 12)`, bloku `(13, 0, 12)` a severního zábradlí lodžie (`y = 1, z = 12`) jsou přímo součástí `evalRoofParapetCover("powder-yard")` v `GridSystem.ts`.
3. **Dodržení barokní konstituce (`ADR-0007`)**:
   - Středy pochozích dlaždic ($\pm 0.35\text{ m}$) zůstávají zcela čisté pro 100% čitelnost doutnákové stopy a kartáčových kuželů; `COURTYARD_KEG` využívá kanonický 10% heroldský akcent výbušného sudu.
