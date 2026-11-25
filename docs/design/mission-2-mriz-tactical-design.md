# Taktický design misí v tahových hrách a přepracování Mise 2 (`Mříž`)

## 1. Analýza z prvních principů: Co dělá misi v tahové taktice skutečně zábavnou?

V tahových taktických hrách (*XCOM 2*, *Into the Breach*, *Invisible, Inc.*, *Shadow Tactics*, *Fire Emblem: Conquest*, *Gears Tactics*) nevzniká zábava z pouhého vyčerpávání bodů zdraví (HP) nepřátel v přestřelce za statickým krytem. Pokud je optimální strategií „stát v plném krytu a střílet s 65% šancí, dokud všichni nepadnou“, mise degeneruje v únavnou loterii opotřebení (*attrition slog*).

Skutečné taktické napětí (*interesting decisions* podle Sida Meiera) vzniká tehdy, když je hráč v každém kole postaven před **nekompatibilní požadavky na omezený rozpočet akčních bodů (AP), prostoru a času**. Z rozboru špičkových her žánru plynou čtyři základní pilíře špičkového designu misí:

---

### Pilíř A: Protiběžné hodiny a vektorové dilema (*XCOM 2*, *Invisible, Inc.*)
- **Mechanismus v referenčních hrách**: V *XCOM 2* (mise *Protect the Device* nebo *VIP Extraction*) a *Invisible, Inc.* běží neúprosný časovač, který hráči zakazuje pasivní čekání v krytu (*overwatch creeping*). Hráč musí současně:
  1. **Postupovat k cíli** (spotřebovávat AP na pohyb a interakci s objektem),
  2. **Potlačovat bezprostřední hrozby** (spotřebovávat AP na střelbu, krytí či hašení).
- **Proč to funguje**: Každý bod AP utracený za bezpečnou likvidaci nepřítele je bod AP, který chybí na posunutí primárního cíle. Hráč neustále počítá: *„Mohu si dovolit nechat tohoto střelce naživu ještě jedno kolo, abych odjistil západku včas?“*

---

### Pilíř B: Telegrafované hrozby a čitelná protihra (*Into the Breach*)
- **Mechanismus v referenčních hrách**: V *Into the Breach* nepřátelé (Vekové) jasně signalizují svůj záměr útoku na konkrétní budovu či jednotku. Zábava nespočívá v tom, že nepřítele zabijete hrubou silou, ale že **přesunem, strčením, kouřem nebo zablokováním linie** zmaříte jeho přípravu a přetavíte jeho pozici v jeho vlastní zkázu.
- **Proč to funguje**: Odstraňuje frustraci z náhody a odměňuje prostorovou představivost. Hráč vidí, že nepřítel chystá smrtící akci (např. rituál na klenáku nebo zápalnou smolu na rumpál), a má v rukou **více než jeden způsob**, jak do tohoto řetězce zasáhnout (přerušení rituálu zásahem, odpálení prachového sudu v linii pochodu, zteč na prahu průjezdu).

---

### Pilíř C: Asymetrická triáda rolí a vertikální geometrie (*Shadow Tactics*, *Commandos*)
- **Mechanismus v referenčních hrách**: V *Shadow Tactics: Blades of the Shogun* má každá postava radikálně odlišný prostorový profil (Mugen jako těžký rváč držící úžinu, Hayato/Takuma jako střelci z výšky, Yuki/Aiko jako rychlí specialisté na mechanismy a pasti). Mise je navržena jako **třípatrový hodinový stroj**, kde žádná postava nedokáže vyhrát sama a každá operuje v jiné výškové či prostorové vrstvě.
- **Proč to funguje**: Zabraňuje pohybu v jednom chumlu (*deathballing*). Hráč musí koordinovat akce napříč patry: výstřel z podsebití ve 2. patře ($y = 2$) otevírá cestu specialistovi v 1. patře ($y = 1$) a ulevuje tlaku na těžkého obránce v průjezdu ($y = 0$).

---

### Pilíř D: Dynamická proměna bojiště a environmentální páky (*Divinity: Original Sin 2*, *Gears Tactics*)
- **Mechanismus v referenčních hrách**: Bojiště není statická šachovnice. Výbušné sudy, požáry měnící bezpečný kryt ve smrtící past, zničitelné zábradlí a úzká hrdla (*chokepoints*), v nichž lze nepřítele zatlačit nebo rozmetat řetězovou explozí, dávají hráči možnost zvrátit nepříznivý poměr sil jedním chytrým tahem.
- **Proč to funguje**: Vytváří památné „heuréka“ momenty, kdy jediný výstřel do prachového sudu nebo včasný výpad zblízka vyřeší dvě hrozby najednou.

---

## 2. Diagnostika původního stavu Mise 2 (`Mříž`)

Původní verze Mise 2 (Staroměstská mostecká věž, svítání 26. července 1648) měla silný narativní a architektonický základ (ADR-0016, ADR-0017), ale v praxi trpěla čtyřmi taktickými slabinami:

1. **Prázdná mostovka bez prostorové volby ($x: 1..9$)**: Karlův most byl zcela holý koridor o šířce 6 polí bez jediného krytu či interaktivního prvku. Všichni 4 švédští harcovníci v 1. kole naběhli v přímce na $x = 9$ ($z \in \{12, 13, 15, 16\}$) a tam staticky stáli až do konce hry.
2. **Jednorozměrný pochod okultisty**: Švédský okultista kráčel po ose $z = 14$ ($x: 1 \to 9$) tempem 2 pole za kolo zcela izolovaně. Neměl žádnou synergii s harcovníky a hráč s ním interagoval výhradně jako s chodícím terčem.
3. **Nevyužitá role Havla Řezáče na přízemí ($y = 0$)**: Havel začínal na Křižovnickém náměstí $(19, 0, 13)$ s řeznickým sekáčkem a těžkou mušketou. Protože harcovníci stáli na $x = 9$ a nesměli vstoupit do průjezdu ($x \ge 10$) kvůli Obraně věže (*Tower Ward*), Havel neměl na přízemí žádný unikátní taktický úkol kromě běžné střelby a v 1. kole kvůli vzdálenosti 10 polí od prahu ani nedosáhl na kontaktní boj.
4. **Statická AI harcovníků po dosažení prahu**: Jakmile harcovník došel na $x = 9$, AI (`computeMission2Ai`) vracela `move: null` a pouze střílela na nejbližší cíl nebo hodila smolný džbánek, aniž by reagovala na to, zda hráč právě odjišťuje rumpál, zda okultista provádí obřad, nebo zda je pozice harcovníka nekrytá.

---

## 3. Konkrétní architektonické a mechanické obohacení Mise 2 (`Mříž`)

Abychom zachovali 100 % stávajících invariantů (včetně deterministických testů v `scripts/test-mission2.ts` a `scripts/test-scenario-lifecycle.ts`) a zároveň povýšili Misi 2 na plnohodnotný taktický hlavolam, zavádíme pět vzájemně provázaných systémů:

### 3.1 Taktická geometrie Karlova mostu a prachový sud na mostovce
- **Kamenné pilíře a poloviční kryty na mostě**: Na mostovce ($y = 0$) přidáváme poloviční kryty (`cover.E = "half"`, `cover.W = "half"`) na strategických bodech mimo přímé dráhy 1. kola (`(4, 0, 11)`, `(4, 0, 16)`, `(7, 0, 13)`, `(7, 0, 15)`), které dávají okultistovi i přesouvajícím se harcovníkům taktické opěrné body, aniž by blokovaly přímý běh `harrier-1` na `(9, 0, 12)` za 1 AP nebo průhled z `(9, 0, 14)` na rumpál `(11, 1, 14)`.
- **Opuštěný prachový sud na mostovce (`BRIDGE_KEG = { x: 8, y: 0, z: 14 }`, popř. `{ x: 7, y: 0, z: 14 }` / `{ x: 8, y: 0, z: 13 }`)**:
  - Umístění prachového sudu na `(8, 0, 13)` (přímo v zóně, kde se shromažďují harcovníci u prahu $x = 8..9$ a kudy ve 3.–4. kole prochází okultista po $z = 14$) vytváří **okamžité taktické dilema**:
  - Odpálí hráč sud hned v 1.–2. kole, aby zmrzačil čelní harcovníky na $x = 9, z = 12..13$ a zničil jim kryt, nebo počká do 3.–4. kola, až do dosahu $3 \times 3$ ($x \in 7..9, z \in 12..14$) vstoupí samotný **Švédský okultista**, čímž mu způsobí masivní poškození (8 HP) a přeruší nástup k obřadu?

### 3.2 Okultistovo zaklínání a synergie s harcovníky (*Rite & Ward Pressure*)
- **Přerušení obřadu zásahem (*Rite Disruption / Stagger*)**:
  - Pokud je okultista na klenáku `(9, 0, 14)` a hráč jej zasáhne střelbou, výbuchem nebo zblízka (`applyOccultistHit` / poškození v boji), jeho soustředění na klenáku je pro dané kolo otřeseno (`occultistDisturbed: boolean` nebo snížení postupu obřadu / zamrznutí v kole zásahu, případně přímá akce), což dává obraně zoufalou možnost koupit si drahocenné kolo navíc přesnou trefou z podsebití ($y = 2$), když je rumpál v plamenech.
- **Taktické chování AI harcovníků (`computeMission2Ai`)**:
  - Harcovníci na prahu ($x \le 9$) již nezůstávají slepě stát:
    1. **Priorita 1 — Sabotáž rumpálu**: Pokud harcovník drží zápalný džbánek (`!pitchThrown[h.id]`), rumpál ještě nehoří (`!windlassBurning`) a má průhled na `(11, 1, 14)` do vzdálenosti 3 polí, hodí zápalnou smolu. Pokud je rumpál odjišťován (`windlassArmed`) nebo má málo HP (`windlassHp <= 9`), harcovníci s průhledem na rumpál aktivně soustředí palbu do mechanismu či obsluhy v 1. patře.
    2. **Priorita 2 — Krytí okultisty a boční manévr na prahu**: Pokud je harcovník na $x < 9$, nejprve obsadí práh $x = 9$ ve své dráze $z$ (zachování deterministického invariantu 1. kola). V dalších kolech, pokud ze své pozice nemá cíl nebo je krytý, může manévrovat podél prahu ($x \in \{8, 9\}$) na pole s nejlepším výhledem na obránce v podsebití či průjezdu.

### 3.3 Aktivní role Havla Řezáče a obrana prahu průjezdu ($y = 0, x = 10$)
- **Zteč na prahu věže ($x = 10 \leftrightarrow x = 9$)**:
  - Protože harcovníci stojí na $x = 9, y = 0$ a průjezd věže začíná na $x = 10, y = 0$, obránce stojící na prahu brány `(10, 0, z)` je v přímém sousedství (`manhattan === 1`) s harcovníkem na `(9, 0, z)`.
  - Havel Řezáč (který má řeznický sekáček s vysokým poškozením a schopnost *Заtlačení / Řeznický výpad*) může z průjezdu `(10, 0, 12..16)` provádět devastující výpady zblízka přes práh brány na harcovníky na $x = 9$, aniž by sám opustil chráněný prostor pod věží!
- **Zátaras prahu / Vyražení na klenák (*Threshold Brace / Keystone Disruption*)**:
  - Pokud obránce (zejména Havel nebo Ondřej) stojí přímo na prahu brány `(10, 0, 14)` naproti klenáku `(9, 0, 14)`, může přímo ohrožovat okultistu na klenáku zblízka (vzdálenost 1 pole!) nebo pomocí nové kontextové akce **„Rozrazit obřad na klenáku“ (`applyDisruptKeystone`)** za 1 AP ze sousedního pole `(10, 0, 13..15)` na $y = 0$ (nebo zásahem okultisty) srazit postup okultistova obřadu o 1 stupeň (`riteProgress = Math.max(0, riteProgress - 1)`) a otřást jím!
  - Tím dostává přízemí ($y = 0$) a Havel Řezáč **kritickou strategickou roli**:
    - **P2 ($y = 2$, Podsebití — Jiří Plachý)**: Vertikální palebná převaha (+15 % Zvýšená pozice, kryt podsebití) + modlitba u mariánského nápisu `(16, 2, 14)` prodlužující obřad ze 3 na 4 kola.
    - **P1 ($y = 1$, Síň rumpálu — Ondřej / Plachý)**: Technické jádro mise — odjištění západky rumpálu `(11, 1, 14)` (Ondřej 1 kolo, ostatní 2 kola), hašení smolného požáru a přeseknutí napjatého lana `(12, 1, 14)`.
    - **P0 ($y = 0$, Průjezd brány — Havel Řezáč)**: Těžký strážce prahu `(10, 0, 12..16)` — sekáčkem likviduje harcovníky přitisknuté k prahu $x = 9$, střeží průchod proti střelbě do síně rumpálu a na `(10, 0, 13..15)` může fyzicky **narušit okultistův obřad na klenáku `(9, 0, 14)`**, pokud se odjištění rumpálu v 1. patře zdrželo kvůli požáru nebo zranění Ondřeje!

---

## 4. Matice taktických rozhodnutí po kolech (Flow Mise 2)

| Kolo | Stav bojiště a tlak nepřítele | Taktická volba hráče (3 patra = 3 propojené úkoly) |
| :--- | :--- | :--- |
| **Kolo 1** | Harcovníci sprintují po mostě k prahu $x = 9$. Okultista vyráží z $(1, 0, 14)$ na $(3, 0, 14)$. | **Plachý ($y=2$)**: Pokleknout u nápisu `(16, 2, 14)` (koupí 4. kolo obřadu), nebo hned pálit z podsebití `(10, 2, z)`? **Ondřej ($y=0 \to 1$)**: Běžet ke schodišti `(14, 0, 17)` do síně rumpálu. **Havel ($y=0$)**: Postoupit z náměstí `(19, 0, 13)` do průjezdu věže `(13..15, 0, 13)` k prahu. |
| **Kolo 2** | Harcovníci na $x = 9$ hází zápalnou smolu na rumpál `(11, 1, 14)` (-3 HP/kolo) a pálí do oken. Okultista je na $(5, 0, 14)$. | **Ondřej ($y=1$)**: Dorazí k rumpálu `(11, 1, 14)`. Musí nejprve uhasit oheň (`applyDouseAction`), nebo rovnou odjistit západku (`applyUnpinAction`) s rizikem zásahu? **Havel ($y=0$)**: Dorazí na práh `(10, 0, 12..15)` a sekáčkem napadá harcovníky na $x = 9$. **Prachový sud `(8, 0, 13)`**: Odpálit hned proti harcovníkům, nebo šetřit na okultistu? |
| **Kolo 3** | Okultista dochází na $(7, 0, 14)$ — přímo k prachovému sudu `(8, 0, 13)`! Rumpál buď hoří, nebo se odjišťuje. | **Rozhodující moment**: Výstřel do prachového sudu `(8, 0, 13)` zasáhne okultistu i harcovníky na prahu. Pokud byl Ondřej v 1. patře zasažen, odjištění západky se zdrželo o 1 kolo. Plachý může seběhnout do 1. patra k lanu `(12, 1, 14)` nebo krýt Ondřeje shora. |
| **Kolo 4+** | Okultista stojí na klenáku `(9, 0, 14)` a zahajuje obřad (`riteProgress` roste). | **Závod s časem**: Pokud je západka volná (`pawlUnpinned`), kdokoliv s čepelí u `(12, 1, 14)` přesekne lano (`applySeverRopeAction`) a mříž dopadne. Pokud západka ještě drží, **Havel na prahu `(10, 0, 14)` může fyzicky narušit obřad na klenáku (`applyDisruptKeystone`)** a získat klíčové kolo navíc! |

---

## 5. Ošetření rizik a okrajových případů (Risk Mitigation)

1. **Zachování deterministického pathfindingu v testech (`scripts/test-mission2.ts`)**:
   - *Riziko*: Přidání krytů nebo sudu na mostovku by mohlo zablokovat přímou dráhu `harrier-1` na `(9, 0, 12)` za 1 AP nebo prodloužit pochod okultisty z `(1, 0, 14)` na `(9, 0, 14)` přes 4 kola.
   - *Řešení*: Dráha $z = 12$ ($x: 1..9$) a $z = 14$ ($x: 1..9$) zůstává 100% průchozí (`walkable: true`). Prachový sud je umístěn na `(8, 0, 13)` (sousedí s $z = 12$ i $z = 14$ v blast zóně $3 \times 3$, ale nestojí v přímé ose $z = 12$ ani $z = 14$). Kamenné poloviční kryty na mostě jsou směrové hrany (`cover.E = "half"`, `cover.W = "half"`) na průchozích dlaždicích, které nezvyšují cenu pohybu a neblokují LoS z `(9, 0, 14)` na `(11, 1, 14)`.
2. **Čitelnost mřížky podle ADR-0007 (Baroque Art Direction)**:
   - *Riziko*: Vizuální přehlcení mostovky.
   - *Řešení*: Středy polí ($\pm 0.35\text{ m}$) na mostovce zůstávají čisté (60 % klidné břidlicové dlažby `cobble`), poloviční kryt tvoří nízké pískovcové patníky u okrajů a jediný 10% akcent na mostě tvoří okovaný prachový sud na `(8, 0, 13)`.
3. **Prevence soft-locku při ztrátě Ondřeje**:
   - *Riziko*: Pokud Ondřej padne dříve, než odjistí západku nebo přesekne lano, mise musí zůstat dohratelná s Plachým a Havlem.
   - *Řešení*: Západku i hašení může provést jakýkoliv obránce (Plachý i Havel za 2 kola), lano může přeseknout kdokoliv s čepelí (`dagger` nebo `sword` — Plachý má kord, Ondřej dýku, Havel sekáček) a Havel může na prahu `(10, 0, 13..15)` zdržovat okultistův obřad pomocí `applyDisruptKeystone`, dokud Plachý nedokončí práci u rumpálu.
