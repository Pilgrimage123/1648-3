# Návrh 3 nových misí pro *Praha 1648* (Mise 4, 5 a 6) — Nové postavy, systémy a architektura

Tento dokument navazuje na pilíře taktického designu z `docs/design/mission-2-mriz-tactical-design.md` a `docs/design/mission-3-doutnak-tactical-design.md` a respektuje závazné architektonické a umělecké konstituce projektu:
- **Engine a mřížka**: Čistý TypeScript bez závislostí na Three.js/Reactu v `src/core/missionN.ts`, pevná 3D mřížka `24 × 28 × 3` (`y ∈ {0, 1, 2}`), 5 siluetních archetypů (`commander`, `ranger`, `sniper`, `trooper`, `sectoid`), fázové nabíjení (`2–4 AP`), `Furketa`, `Poslední vzepětí`, `Odhození` a `Střelecká hlídka` (`360°` kolečkový zámek vs. `90°` doutnáková salva).
- **Fyzika prostředí (`ADR-0011`, `ADR-0015`, `ADR-0018`)**: `isEnclosedRoofed`, `Vnitřní stagnace kouře`, `Průvanové odvětrávání portálů` (`getOpenExteriorDoors()`), `Zadýmení` vs. `Odolnost těžké zbroje proti zadýmení`, `Barokní šerosvit`, `Praktické světlo`.
- **Svět a téma (`ADR-0007`, `ADR-0014`)**: Historická linka obléhání Prahy (srpen–říjen 1648), perspektiva *Železné vigilie* a Klementina (**Víra a věda**), pravidlo barev **60–30–10** a čisté středy dlaždic ($\pm 0.35\text{ m}$).
- **Nová osádka**: Každá ze tří misí přivádí **3 zcela nové hratelné postavy** z rozdílných pražských stavů (mlynáři, lékárníci, vodárenští kováři, klementinští optici, tiskaři, židovská obranná setnina, novoměstští zvonaři, vorařští zvědové a císařští hejtmani), čímž naplňuje premisu `ADR-0014` (společenství napříč pražskými stavy bez recyklace hrdinů z Misí 1–3).

---

## Přehled kampaně: Jak Mise 4–6 rozšiřují taktický prostor hry

| Mise | Název & Datum (1648) | Lokace & Počasí | Dosud nevyužitá páka enginu | Protiběžné hodiny (Pilíř A) | Hlavní telegrafovaná hrozba (Pilíř B) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mise 4** | **Jez a mlýnice** (12. srpna, svítání) | Staroměstské mlýny u Novotného lávky · **`fog` (Mlha)** | **Průvanové odvětrávání portálů** proti výbuchu moučného prachu + dynamické zaplavení brodů stavidlem (`cobble` $\to$ `water`) | Plující zápalný prám (`bargeX: 4 → 14`) vs. otevření 2 stavidel (`y = 0` a `y = 1`) | Švédský prám + kotevní háky + vznícení nevyvětraného moučného prachu při výstřelu doutnákovou mušketou |
| **Mise 5** | **Zvon a čočka** (28. září, noc na sv. Václava) | Klementinum: Hvězdárna, Tiskárna a nádvoří · **`clear` + `Barokní šerosvit`** | **Dynamické `Praktické světlo`** (parabolické zrcadlo měnící Fog of War) + **Kumulativní clona kouře** přerušující optický paprsek | Udržení světelného telegrafu na baterii (`2` nepřerušená kola) vs. švédští žháři v tiskárně (`pressHp`) | Telegrafované dopady minometných bomb z Letné ($3 \times 3$) v kolech, kdy svítí zrcadlo |
| **Mise 6** | **Kontramina** (25. října, noc generálního útoku) | Novoměstské hradby a podkop u Koňské brány · **`rain` (Liják)** | **3-patrový průřez se štolou v `y = 0`** (`Vnitřní stagnace kouře` + `Odolnost kyrysu`) + eskortní přenos těžké zvonové petardy | Švédský podkop (`mineProgress: 0 → 4`) vs. doprava a odjištění zvonové petardy v podkopné komoře | Telegrafované podkopné nálože, švédští kyrysníci na valu (`y = 1`) a hrozba zřícení štoly |

---

# MISE 4: `JEZ A MLÝNICE` (12. srpna 1648 · Ranní vltavská mlha)

## 1. Historická a taktická premisa
V husté ranní mlze (`weather: "fog"`, $-10\text{ \%}$ k zásahu) spouští Königsmarckův oddíl po Vltavě **zápalný prám** naložený smolnými věnci a sudy prachu směrem ke Staroměstským mlýnům (dnešní Novotného lávka). Mlýny melou mouku pro celé obležené Staré Město a pohánějí dřevěnou vodárenskou věž. Švédští pěšáci a plavci mezitím přebrodili mělký jez pod mostem, aby zablokovali jalové stavidlo a přitáhli prám k mlýnským kolům.

## 2. Nové hratelné postavy (Asymetrická triáda — Pilíř C)

| Postava (`id`) | Archetyp & Zbroj | Výzbroj (`WEAPON_CATALOG` / `MELEE_CATALOG`) | Unikátní mechanika v Misi 4 |
| :--- | :--- | :--- | :--- |
| **Mistr Prokop Šípek** (`player-sipek`) · Staroměstský stárka mlynářů | `commander` · `HP 13`, `Armor 1`, `Move 5` · **VIP** | `sipek_wheellock_pistol` (kolečková pistole, `5–7 HP`, `reload 2 AP`, `360°` hlídka) · `mill_pole_hook` (okované bidlo s hákem, `4–6 HP`, **`Odhození` o 1 pole** — lze strčit Švéda do náhonu!) | **Znalec vantroků**: Otevírá nebo zavírá stavidlo za **`1 AP`** (ostatní za `2` kola / `2 AP`) a dokáže na `1` pole odrazit kotevní hák pramu. |
| **Klára z Lékárny u Zlatého orla** (`player-klara`) · Apatykářka & bylinkářka | `sniper` · `HP 11`, `Armor 0`, `Move 5` | `klara_apothecary_carbine` (přesná kolečková karabina, `baseAccuracy 68`, `misfire 3 %`, **bez doutnáku — nezapaluje moučný prach!**) · `apothecary_knife` (`3–5 HP`) | **Octová rouška a obklad (`1 AP`, 2 náboje)**: Na sousedním poli okamžitě ruší `Zadýmení` a `Otřesený` a obnoví `+4 HP` (nebo zneškodní dým na 1 poli). |
| **Matyáš „Hrom“ Kovář** (`player-matyas`) · Podkovář vodárenské věže | `trooper` · `HP 15`, `Armor 3`, `Move 4` | `matchlock_musket_fork` (těžká mušketa s furketou, `7–10 HP`, `reload 4 AP`, **pozor: doutnák v nevyvětrané mlýnici zapálí moučný prach!**) · `forge_hammer` (kovářské kladivo, `6–8 HP`, `armorShred 2`, `stunChance 25 %`) | **Odolnost těžké zbroje**: S `Armor 3` je imunní vůči `Zadýmení` v zakouřené mlýnici; kladivem za `1 AP` přerazí švédský kotevní hák u břehu (`breakGrapple`). |

## 3. 3D Geometrie mapy (`24 × 28 × 3`) a Barokní biom (`ADR-0007`)
- **Celková orientace**: Řeka Vltava a mlýnský náhon na západě (`x: 2..9, z: 6..20`, `surface: "water"`), brod a kamenný jez (`x: 8..10, z: 12..16`, zpočátku suchý/mělký `cobble`, po otevření stavidla zaplavený `water`!), krytá Staroměstská mlýnice (`x: 11..18, z: 9..17`, `y = 0..1`, `isEnclosedRoofed === true`), vodárenská věž (`x: 15..18, z: 14..17`, `y = 0..2`).
- **Tři patra**:
  - **`y = 0` (Mlýnský náhon, brod a přízemí mlýnice)**:
    - *Západní stavidlo*: `SLUICE_WEST = { x: 10, y: 0, z: 10 }` (na hraně vantroků, kryté jen polovičním zábradlím proti švédské palbě z břehu).
    - *Portály pro Průvanové odvětrávání*: Dvoje dvoukřídlá mlýnská vrata `MILL_DOOR_N = { x: 14, y: 0, z: 9 }` a `MILL_DOOR_W = { x: 11, y: 0, z: 13 }` (zpočátku **zavřená**).
    - *Zóny moučného prachu (`flourTiles`)*: 3 označené dlaždice u mlýnských kamenů `(13, 0, 12)`, `(14, 0, 12)`, `(13, 0, 14)` — jemný světle okrový poprašek na obvodu dlaždic ($\pm 0.35\text{ m}$), střed čistý.
  - **`y = 1` (Sýpka a komora zdvihacího řetězu vodárny)**:
    - Přístup po vnitřním schodišti `(16, 0, 16) <-> (16, 1, 16)`.
    - *Horní řetězové stavidlo*: `SLUICE_TOWER = { x: 16, y: 1, z: 14 }` (vysoká páka řetězu s výhledem západním oknem na řeku; západní hrana `x = 15, z: 13..15` má v `evalRoofParapetCover` `W: "half"`).
  - **`y = 2` (Koruna vodárenské věže, `x: 15..18, z: 14..17`)**:
    - Otevřená plošina s `+15 %` výškovou převahou a `Průhledem z výšky přes dým` + mlhu pro Kláru, odkud má čistou LoS na prachové sudy přímo na plujícím zápalném pramu!
- **60–30–10 Barokní paletizace**:
  - **60 %**: Tlumená modrošedá mlha nad Vltavou, mokrá břidlicová dlažba, ztmavlé dubové podlahy mlýnice.
  - **30 %**: Pískovcové pilíře jezu, trámky vodárenské věže, pytle s obilím (`low_wall`).
  - **10 %**: Hořící smolný prám (oranžový žár), měděná táhla stavidel (zlatý akcent), kotevní háky a prachové sudy na pramu (šarlat/zlato).

## 4. Jádrové mechaniky a stavový automat (`Mission4Clock`)
```ts
export interface Mission4Clock {
  bargeX: number;              // Start 4, cíl nárazu 14 (+2 pole za švédský tah, pokud není zachycen)
  bargeZ: number;              // Pevná dráha z = 12 (střed náhonu)
  bargeKegsRemaining: number;  // 2 sudy na pramu (zničení obou prám potopí jako alternativní výhru!)
  grappleCount: number;        // 0..2: Švédští plavci hází kotevní háky na x = 11; s hákem se prám posune o +3!
  sluiceWestOpen: boolean;     // Otevření stavidla na (10, 0, 10)
  sluiceTowerOpen: boolean;    // Otevření řetězového zdvihu na (16, 1, 14)
  flooded: boolean;            // True jakmile jsou otevřena obě stavidla -> zaplaví brod a smete prám mimo mlýn
  flourVented: boolean;        // True jakmile je alespoň 1 portál mlýnice otevřený po 1 celý tah (Through-Draft)
  millBurningTurns: number;    // 0..2 (po 2 kolech požáru bez uhašení mlýn lehne popelem -> prohra)
  loss: "mill_burned" | "sipek" | "wiped" | null;
}
```

### Klíčová taktická dilemata (Proč je mise zábavná)
1. **Dvě rovnocenné cesty k vítězství (Pilíř B & D)**:
   - *Hydrotechnická cesta*: Otevřít obě stavidla (`SLUICE_WEST` + `SLUICE_TOWER`). Jakmile se otevře druhé, příval vody z jalového jezu (`flooded = true`) **okamžitě strhne zápalný prám mimo mlýnská kola (výhra)**, ale současně **promění brod `x: 8..10, z: 12..16` v hlubokou vodu (`walkable: false`)** — kdokoli ze Švédů na brodu je smeten a obránce na `(10, 0, 10)` musí předem ustoupit nebo riskovat odhození.
   - *Střelecká cesta*: Klára z 2. patra vodárny (`y = 2`) a Matyáš z oken sýpky (`y = 1`) odstřelí oba prachové sudy přímo na plujícím pramu (`bargeKegsRemaining: 2 → 0`) dřív, než dopluje na `bargeX >= 14`, zatímco Prokop a Matyáš odrážejí brodící se Švédy od kotevních lan.
2. **Fyzika moučného prachu a Průvanové odvětrávání (`ADR-0011`)**:
   - Dokud jsou oboje mlýnská vrata zavřená (`!flourVented`), výstřel **doutnákovou zbraní** (Matyášova mušketa nebo švédské M1624) uvnitř mlýnice odpálí **exploze moučného prachu** (3 HP všem na `flourTiles`, `+3` tahy kouře, `millBurningTurns += 1`).
   - **Řešení**: Otevřít za `0 AP` mlýnská vrata (`toggleDoor`), čímž se spustí existující mechanismus `getOpenExteriorDoors()` (průvan za 1 kolo vyvětrá prach), **NEBO** uvnitř střílet výhradně kolečkovými zbraněmi (Prokop, Klára) a bít se na blízko — ale otevřená vrata vpustí dovnitř švédské plavce!
3. **Švédská AI (`computeMission4Ai`)**:
   - **2× Švédský říční ženista (`enemy-sapper-1..2`)**: Postupují přes mělký brod (`x: 8..10, z: 12..16`) ke břehu `(11, 0, 11..13)` a za `1 AP` vrhají kotevní hák (`grappleCount++`), který zrychlí prám na `+3` pole/tah. Pokud je Prokop bidlem (`Odhození`) srazí zpět do proudu, hák spadne.
   - **2× Švédský mušketýr na břehu (`enemy-bank-1..2`, M1624)** + **1× Švédský lodivod-žhář (`enemy-firemaster`)**: Kryjí ženisty z pískovcových pilířů jezu a úmyslně střílejí dovnitř mlýnice, aby využili moučný prach, pokud hráč nezavře křídlo dveří nebo nevyvětrá.

## 5. Ošetření rizik a okrajových případů (Mise 4)
- **Soft-lock při pádu Prokopa**: Prokop je VIP (pád = prohra, jako Plachý v Misi 2/3), ale stavidla umí otevřít i Matyáš/Klára (za 2 tahy) — žádná jednotka nemůže zablokovat interakci.
- **Zaplavení pod vlastní nohou**: Při aktivaci druhého stavidla funkce `resolveFlood` nejdříve posune každou živou jednotku na brodu o 1 pole na východ na suchou dlažbu `x = 11` (případně poškodí Švéda o 4 HP a vytlačí ho na západ), nikdy nenechá živou jednotku stát na `walkable: false` dlaždici.

---

# MISE 5: `ZVON A ČOČKA` (28. září 1648 · Noc na sv. Václava, Klementinum)

## 1. Historická a taktická premisa
Svátek svatého Václava v obležené Praze. Na hřebeni Letné stojí nová švédská těžká minometná baterie, která v noci zapaluje staroměstské střechy. V klementinské hvězdárně (*Víra a věda*, `ADR-0014`) spočítal **Magistr Tadeáš Krumlovský** (žák fyzika Jana Marka Marciho) přesnou optickou azimutovou osu, podle níž mohou staroměstští dělostřelci na Františku v noci baterii zničit jediným salvovým výstřelem — ale potřebují **světelný telegraf z parabolického zrcadla ve 2. patře hvězdárny** udržovaný po `2` nepřerušená kola. Ve stejnou noc však do přízemní klementinské tiskárny vniká švédské žhářské komando, aby spálilo mědirytové desky s plány pražského opevnění a přerušilo signál.

## 2. Nové hratelné postavy (Asymetrická triáda — Pilíř C)

| Postava (`id`) | Archetyp & Zbroj | Výzbroj (`WEAPON_CATALOG` / `MELEE_CATALOG`) | Unikátní mechanika v Misi 5 |
| :--- | :--- | :--- | :--- |
| **Magistr Tadeáš Krumlovský** (`player-tadeas`) · Klementinský optik a matematik | `commander` · `HP 12`, `Armor 1`, `Move 5` · **VIP** | `tadeas_wheellock_pistol` (přesná zdobená pistole, `5–8 HP`, `armorPierce 2`, `360°` hlídka) · `compass_rapier` (kord, `4–6 HP`) | **Optika hvězdárny**: Pasivně `+3` pole dohledu v šerosvitu (dalekohled). Seřídí nebo zacloní parabolické zrcadlo (`toggleMirror`) na `(12, 2, 14)` za **`1 AP`** (ostatní za `2 AP`). |
| **Eliáš ben David** (`player-elias`) · Brusič čoček a dobrovolník židovské obranné setniny | `sniper` · `HP 12`, `Armor 1`, `Move 5` | `elias_rifled_carbine` (drážkovaná kolečková ručnice, `6–9 HP`, `optimalRange 9`, `maxRange 16`, `armorPierce 2`) · `lens_dagger` (`3–5 HP`) | **Hasící vak s pískem a vápnem (`1 AP`, 3 náboje, dosah 6 polí)**: Okamžitě **vyčistí kouř (`smokeTurns = 0`) v zóně $3 \times 3$** (obnoví přerušený světelný paprsek!) a uhasí požár v tiskárně. |
| **Barbora Hladíková** (`player-barbora`) · Mistrová klementinské tiskárny | `ranger` · `HP 13`, `Armor 1`, `Move 6` | `wheellock_carbine` (`4–6 HP`, `reload 2 AP`) · `press_iron_bar` (těžká železná tiskařská páka, `5–7 HP`, `stunChance 30 %`, `Odhození` o 1 pole) | **Ochrana tiskárny (`1 AP`)**: Dokáže na sousedním portálu **závorou utěsnit dveře** (Švéd musí utratit celý tah na vyražení) nebo přenést ohrožené mědirytové desky z dosahu ohně. |

## 3. 3D Geometrie mapy (`24 × 28 × 3`) a Barokní biom (`ADR-0007`)
- **Architektura Klementina (Čtyřkřídlé nádvoří = `Vertikální světlík`!)**:
  - **`y = 0` (Klementinská tiskárna a křížová chodba kolem vnitřního nádvoří)**:
    - *Vnitřní nádvoří (`x: 9..14, z: 11..16`, `cobble`, pod širým nebem)* — otevřený světlík pod hvězdárnou.
    - *Tiskárna v jižním křídle (`x: 7..16, z: 18..22`, `stone_floor`, `isEnclosedRoofed === true`)* se 2 tiskařskými lisy (`PRESS_A = (10, 0, 20)`, `PRESS_B = (13, 0, 20)`) a 3 vnějšími/vnitřními dveřmi (`toggleDoor` pro průvan i blokování žhářů!).
    - *Švédský průlom*: Severní branka z Křižovnické ulice (`x: 11..12, z: 6`).
  - **`y = 1` (Knihovní galerie a arkádový ochoz kolem nádvoří, `x: 7..16, z: 9..17`)**:
    - Obvodový ochoz s vnitřním zábradlím kolem nádvoří (`evalRoofParapetCover`: poloviční kryt ze všech 4 vnitřních hran směrem do nádvoří, `Vyklonění přes balustrádu`!).
    - Ideální palebná pozice pro Eliáše a Barboru — kontrolují nádvoří shora, aniž by stáli v cestě minometům na střeše.
  - **`y = 2` (Hvězdárna a zvonice, `x: 10..14, z: 13..16`)**:
    - *Parabolické zrcadlo (`MIRROR_STAND = { x: 12, y: 2, z: 14 }`)* s přímým výhledem na sever přes Vltavu k Letné.
    - *Hlavní zvon Klementina (`BELL_PULL = { x: 11, y: 2, z: 15 }`)*: Za `1 AP` lze rozezvučet zvon — zvuková vlna přitáhne pozornost švédských hlídek na 1 kolo směrem k nádvoří (odláká žháře od tiskárny!) a vyčistí stav `Otřesený` u všech obránců.
- **Počasí a světlo**: `weather: "clear"`, **`fogOfWarEnabled: true` (`Barokní šerosvit`)** s ostrým kontrastem stříbrného měsíčního světla (`Celestial Light Source`) a zlatého kužele parabolického zrcadla (`Practical Light`).

## 4. Jádrové mechaniky a stavový automat (`Mission5Clock`)
```ts
export interface Mission5Clock {
  mirrorLit: boolean;              // Zda parabolické zrcadlo právě vysílá paprsek k Letné
  signalTurns: number;             // 0..2: Počet nepřerušených kol jasného paprsku (2 = baterie na Letné zničena!)
  beamBlockedBySmoke: boolean;     // True pokud >= 2 pole v ose paprsku (x: 11..13, z: 8..13) mají smokeTurns > 0
  telegraphedMortars: GridCoord[]; // 2–3 středy zón 3x3 vyznačené na konci tahu, pokud mirrorLit === true
  pressHp: number;                 // Start 12; švédští žháři u PRESS_A/B snižují o 4/tah
  platesSaved: boolean;            // Volitelný bonus: Barbora vynesla matrice z (13,0,20) -> zachrání press před 1 zásahem
  barricadedDoors: string[];       // ID dveří zabarikádovaných Barborou (zdrží Švédy o 1 tah)
  loss: "press_burned" | "tadeas" | "wiped" | null;
}
```

### Klíčová taktická dilemata (Proč je mise zábavná)
1. **Dilema světla a minometů (*Into the Breach* + *Invisible, Inc.*)**:
   - Zapnutí parabolického zrcadla (`mirrorLit = true`) okamžitě **prosvětlí celé nádvoří a zruší šerosvit** (všichni Švédové na nádvoří jsou odhaleni pro přesnou palbu z 1. patra), **ale okamžitě vyvolá telegrafovanou salvu 2 švédských minometných bomb ($3 \times 3$)**, z nichž jedna míří na 2. patro hvězdárny (`y = 2`) a druhá na nádvoří!
   - Na konci hráčova tahu se dopadové zóny telegrafují zlatě-karmínovým kruhem; na konci švédského tahu vybuchnou (`5 HP`, ničí kryt, vytváří hustý dým!).
   - **Protihra**: Tadeáš může zůstat na hvězdárně, uhnout mimo zónu $3 \times 3$ a nechat zrcadlo svítit pro dokončení `signalTurns === 2`, **nebo** za `1 AP` zrcadlo zaklopit, aby přerušil ostřelování, pokud je střecha zničená.
2. **Kouř jako přerušovač optické osy (`ADR-0011` + `ADR-0014`)**:
   - Švédští dýmaři (`enemy-smokepot`) házejí na nádvoří dýmové hrnce, čímž vytvoří `Kumulativní clonu kouře` přes optickou osu (`beamBlockedBySmoke = true`) a zastaví načítání `signalTurns`.
   - Hráč má **dvě systémové protihry**: buď **Eliáš hodí hasící/pískový vak** přímo do kouře a okamžitě vyčistí $3 \times 3$, nebo **Barbora otevře protilehlé portály křížové chodby** (`toggleDoor`), čímž průvan rozfouká kouř dvojnásobnou rychlostí!
3. **Švédská AI (`computeMission5Ai`)**:
   - **2× Švédský žhář (`enemy-arsonist-1..2`)**: Ignorují přestřelku na nádvoří a probíjejí se do tiskárny (`y = 0, z: 18..22`) k lisům `PRESS_A/B`, pokud je Barbora nezablokuje závorou nebo neodláká zvonem z `y = 2`.
   - **1× Švédský dýmař (`enemy-smokepot`)**: Jakmile `mirrorLit === true`, prioritně hází dým do nádvoří (`x: 11..13, z: 11..13`), aby zaslepil paprsek.
   - **2× Švédský přepadový mušketýr (`enemy-raider-1..2`)**: Postupují po schodišti do 1. a 2. patra, aby zabili Tadeáše u zrcadla.

## 5. Ošetření rizik a okrajových případů (Mise 5)
- **Zničení zrcadla minometem**: Zrcadlo na `(12, 2, 14)` není zničeno jednou bombou, ale zásah do jeho pole ho **rozladí (`mirrorLit = false`, `signalTurns = 0`)**, takže jej musí Tadeáš nebo Eliáš znovu seřídit (`1 AP`), což předchází neférové okamžité prohře z RNG a nutí k prostorovému krytí.
- **Zatemnění neprozkoumaných pater**: Zapnutí zrcadla na `y = 2` přidává dynamické světlo (`DynamicLightSource`) pouze na otevřené nádvoří (`!isEnclosedRoofed`) a horní ochoz, nikoliv skrz stropy do uzavřených místností tiskárny (`ADR-0010` zůstává 100% nedotčena).

---

# MISE 6: `KONTRAMINA` (25. října 1648 · Generální útok u Koňské brány)

## 1. Historická a taktická premisa
Vyvrcholení třicetileté války v Praze. V noci na 25. října 1648 vrhá švédský generál Wittenberg a falckrabě Karel Gustav elitní úderné kolony na **Novoměstské hradby u Koňské brány**. Vnější hradební zeď je již rozvalena; obránci drží improvizovaný **vnitřní val (*retrenchment*, `y = 1`)**, ale pod nohama obránců v zasypané **podkopné štole (`y = 0`)** již švédští minéři zakládají prachovou minu pod základy vnitřního valu. Jediný způsob, jak útok zlomit, je **dopravit těžkou bronzovou petardu odlitou z puklého novoměstského zvonu** ze zbrojnice na vnitřním valu dolů do podkopné komory (`BREACH_CHAMBER`) a odpálením **kontraminy** zasypat švédskou štolu i čelní průlom.

## 2. Nové hratelné postavy (Asymetrická triáda — Pilíř C)

| Postava (`id`) | Archetyp & Zbroj | Výzbroj (`WEAPON_CATALOG` / `MELEE_CATALOG`) | Unikátní mechanika v Misi 6 |
| :--- | :--- | :--- | :--- |
| **Hejtman Kryštof z Bukova** (`player-krystof`) · Velitel novoměstské posádky (veterán z Brna 1645) | `commander` · `HP 16`, `Armor 3`, `Move 5` · **VIP** | `krystof_cavalry_pistol` (těžká jezdecká kolečková pistole, `6–8 HP`, `armorPierce 2`, `reload 2 AP`) · `imperial_broadsword` (těžký palaš, `6–8 HP`, `armorPierce 2`, `armorShred 1`) | **Nosič zvonové petardy & Polní rozkaz**: Díky `Armor 3` je imunní vůči `Zadýmení` v zakouřené štole; jako jediný nese těžkou zvonovou petardu bez zpomalení (ostatní mají `-2` pole/AP). Za `1 AP` vydá **„Sevřít řady!“** (ruší `Otřesený` všem spojencům do 4 polí a dává `+10 %` k zásahu na 1 kolo). |
| **Ludvík Zvonař** (`player-ludvik`) · Tovaryš novoměstské zvonařské hutě & podkopník | `ranger` · `HP 14`, `Armor 2`, `Move 5` | `wheellock_carbine` (`4–6 HP`) · `bell_crowbar` (železný zvonový sochor, `5–7 HP`, `armorShred 2`, **`Odhození` o 1 pole**) · `2×` petarda | **Podepření klenby (`braceTunnel`, `1 AP`)**: V dolní štole (`y = 0`) zesílí výdřevu, čímž **sníží postup švédské miny o `-1`** (`mineProgress = Math.max(0, mineProgress - 1)`). Odjistí zvonovou petardu v komoře za **`1` tah** (ostatní za `2` tahy). |
| **Dorota z Podskalí** (`player-dorota`) · Vorařská zvědka a znalkyně novoměstských štol | `sniper` · `HP 11`, `Armor 0`, `Move 6` | `dorota_jaeger_stutzen` (drážkovaná lovecká štucna, `6–9 HP`, `baseAccuracy 74`, `armorPierce 2`, `reload 2 AP`) · `raftsman_knife` (`4–6 HP`) | **Vorařská smyčka (`ropeDrop`, `1 AP`)**: Dokáže se spustit/vyšplhat mezi bastionovou hláskou (`y = 2`), valem (`y = 1`) a šachtou do štoly (`y = 0`) na označeném lanovém průlezu `(9, 1, 14) <-> (9, 0, 14)` i mimo zablokované schodiště! |

## 3. 3D Geometrie mapy (`24 × 28 × 3`) a Barokní biom (`ADR-0007`)
- **Třípatrový vertikální řez opevněním**:
  - **`y = 0` (Podkopná štola a zasypaný hradební příkop, `isEnclosedRoofed === true` pro štolu `x: 6..18, z: 12..16`)**:
    - Úzká, klenutá dřevěná štola (`široká 3 pole`, dřevěné stojky jako `pillar` kryty), kde **stagnující kouř** (`Vnitřní stagnace kouře`) okamžitě trestá jednotky bez kyrysu (`Zadýmení`), a kde bojuje těžký boj zblízka o každý metr.
    - *Podkopná komora (`BREACH_CHAMBER = { x: 16, y: 0, z: 14 }`)*: Cíl pro položení zvonové petardy.
    - *Tenká přepážka (`WEAK_BULKHEAD = { x: 13, y: 0, z: 12 }`)*: Zničitelná zídka (`low_wall` / `powder_keg` za ní); její proražení vytvoří **okamžitý průvan do příkopu** (vyvětrá dusivý kouř ve štole!) a otevře boční obchvat přímo za záda švédských minérů!
  - **`y = 1` (Vnitřní val — *Retrenchment* a zbrojnice, `x: 6..18, z: 9..19`)**:
    - *Start zvonové petardy*: `BELL_ARMORY = { x: 8, y: 1, z: 17 }`.
    - *Rozvalený vnější průlom*: Východní okraj (`x = 18, z: 10..17`), kudy v lijáku (`weather: "rain"`) útočí švédští kyrysníci a mušketýři.
    - *Hlavní schodiště do štoly*: `(10, 1, 15) <-> (10, 0, 15)` (klíčové úzké hrdlo, které Švédové chtějí obsadit z valu shora).
  - **`y = 2` (Bastionová hláska Koňské brány, `x: 7..10, z: 11..14`)**:
    - Střešní ochoz nad celým průlomem (`evalRoofParapetCover`: `E: "half"`, `N: "half"`, `S: "half"`). Dorota z hlásky odstřeluje švédské kyrysníky na valu (`y = 1`) a má přehled nad příkopem.
- **Propojení s Kronikou tažení (`CampaignState`, `ADR-0021`)**:
  - Pokud hráč v Misi 3 dosáhl vítězství bez dodané káry (`deliveries === 0` — *„Baterie za úsvitu mlčela“*), začíná Mise 6 s oslabeným švédským podkopem (`mineProgressLimit = 5` místo `4`) — kronikový důsledek bez narušení balancu nových hrdinů.

## 4. Jádrové mechaniky a stavový automat (`Mission6Clock`)
```ts
export interface Mission6Clock {
  petardCarrierId: string | null;  // ID nosiče zvonové petardy (nebo null, pokud leží na zemi)
  petardPos: GridCoord;            // Aktuální pozice petardy (start (8, 1, 17))
  petardPlanted: boolean;          // Položena v BREACH_CHAMBER (16, 0, 14)
  petardFuseTicks: number;         // 0..1 (Ludvík odjistí za 1 tah, ostatní za 2)
  counterMineDetonated: boolean;   // True -> štola zasypána, průlom odražen; stačí evakuovat přeživší ze štoly (y >= 1)
  mineProgress: number;            // 0..4 (roste o +1 za švédský tah, pokud živý švédský minér stojí u (16..17, 0, 14))
  mineLimit: number;               // 4 (nebo 5 s bonusem z Mise 3 bez jizvy)
  bulkheadBreached: boolean;       // Proražení (13, 0, 12) -> aktivuje průvan ve štole a obchvat
  waveSpawned: boolean;            // Ve 3. kole nastoupí švédský kyrysnický zálohový oddíl na y = 1
  loss: "wall_collapsed" | "krystof" | "wiped" | null;
}
```

### Klíčová taktická dilemata (Proč je mise zábavná)
1. **Dvojfrontový tlak `y = 1` vs. `y = 0` (Pilíř A & C)**:
   - Každý voják, kterého pošlete dolů do štoly (`y = 0`) krýt nosiče petardy, **chybí nahoře na vnitřním valu (`y = 1`)**, kde se valí švédští kyrysníci (`armor: 2`, odolní vůči kouři) směrem ke schodišti `(10, 1, 15)`.
   - Pokud padne kontrola nad schodištěm, tým ve štole zůstane po odjištění kontraminy odříznutý! (Zde přichází ke slovu **Dorotina vorařská smyčka** na `(9, 0, 14) <-> (9, 1, 14)` jako nouzová úniková cesta).
2. **Střet s fyzikou `Zadýmení` a `Odolnosti kyrysu` (`ADR-0011`)**:
   - Uzavřená podkopná štola (`y = 0`) je první prostor ve hře, kde jediný výstřel nebo petarda vytvoří **3 tahy stagnujícího dýmu**. Kryštof (`Armor 3`) dýmem projde beze ztráty pohybu, zatímco nezbrojená Dorota či švédští minéři bez kyrysu ztratí `-1` pohyb/AP — dokud někdo neprorazí přepážku `WEAK_BULKHEAD` na `(13, 0, 12)` a nevpustí dovnitř průvan!
3. **Předávání těžké zvonové petardy (`passPetard`, `1 AP`) a únik ze štoly**:
   - Petardu může nést Kryštof (`Move 5`), nebo ji může na schodišti předat Ludvíkovi (`passPetard`), zatímco Kryštof palašem zadrží švédské kyrysníky.
   - Po odjištění kontraminy v `BREACH_CHAMBER = (16, 0, 14)` běží **1 kolo na evakuaci ze štoly** (`y = 0 → y = 1`), než vybuchne hlavní nálož — dramatický závěrečný sprint se zřícením podzemí!
4. **Švédská AI (`computeMission6Ai`)**:
   - **2× Švédský podkopný minér (`enemy-miner-1..2`)**: Drží `y = 0, x: 15..17, z: 13..15`; pokud nejsou otřeseni nebo odhozeni z komory (`Odhození` Ludvíkovým sochorem!), navyšují `mineProgress` o `+1`.
   - **2× Švédský útočný kyrysník (`enemy-cuirassier-1..2`, `armor: 2`, `HP 10`)**: Postupují po `y = 1` k ústí schodiště `(10, 1, 15)` a házejí petardy do krytů na valu.
   - **2× Švédský mušketýr průlomu (`enemy-breach-1..2`, M1624)**: Poskytují krycí palbu z východního okraje valu (`x: 17..18`) a používají `Připravenou salvu` (90° kužel) na přístup k podkopu.

## 5. Ošetření rizik a okrajových případů (Mise 6)
- **Ztráta petardy při smrti nosiče**: Pokud padne nosič petardy (jiný než VIP Kryštof), petarda automaticky spadne na jeho poslední pochozí dlaždici (`petardCarrierId = null, petardPos = unit.pos`) a kdokoli ze zbývajících obránců ji může na sousedním poli zvednout za `1 AP` (`pickUpPetard`).
- **Prevence nesplnitelného úniku po odjištění**: Jakmile `petardFuseTicks` dosáhne odjištění, exploze zasáhne pouze štolovou zónu `y = 0, x >= 11` (nikoli schodiště `(10, 0, 15)` ani lanový průlez `(9, 0, 14)`), takže hráč, který v posledním kole ujde 5–6 polí ke schodům, má vždy deterministicky zaručenou záchranu bez ohledu na RNG.

---

## Technická integrace do architektury repozitáře (Blueprint pro implementaci)

Pokud budou Mise 4–6 implementovány, každá zapadne do stávající čisté architektury bez refaktoringu jádra:
1. **Čisté headless moduly**: `src/core/mission4.ts`, `src/core/mission5.ts`, `src/core/mission6.ts` (stejný vzor jako `mission2.ts` a `mission3.ts`: `createMissionNGrid`, `createMissionNUnits`, `freshClock`, `closePlayerTurn`, `closeEnemyTurn`, `computeMissionNAi`, `judgeMissionN`).
2. **Rozšíření `RoofKind` v `src/core/GridSystem.ts`**: Přidat `"mill" | "klementinum" | "horse-gate"` do `evalRoofParapetCover` a `setRoofMask` (zachová 100% izolaci od Misí 1–3).
3. **Katalog zbraní a i18n (`ADR-0001`)**: Nové položky v `WEAPON_CATALOG`, `MELEE_CATALOG`, `src/i18n/cs-ui.ts` a `src/i18n/cs-messages.ts` ověřené přes `scripts/test-i18n.ts` a `scripts/verify-all.ts`.
4. **3D scény (`ADR-0007`)**: Samostatné modulární komponenty `OldTownMillDressing.tsx`, `KlementinumDressing.tsx`, `HorseGateBreachDressing.tsx` přepínané v `TacticalScene.tsx` podle `scenario`.
5. **Deterministické testy**: `scripts/test-mission4.ts`, `scripts/test-mission5.ts`, `scripts/test-mission6.ts` ověřující vždy minimálně 2 kanonické vítězné linie + 1 linii prohry + všechny unikátní hraniční stavy (zaplavení brodu, průvanové odvětrání moučného prachu, přerušení světelného paprsku kouřem, předání a pád zvonové petardy).
