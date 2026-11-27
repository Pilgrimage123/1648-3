# Taktický design Mise 4 (`Jez a mlýnice` — Staroměstské mlýny, 12. srpna 1648)

Tento dokument specifikuje prostorovou, herní a stavovou architekturu **Mise 4 (`Jez a mlýnice`)** navazující na konstituce `ADR-0007`, `ADR-0011`, `ADR-0014`, `ADR-0015`, `ADR-0022` a `ADR-0025`.

---

## 1. Historické zasazení a taktický rytmus

- **Datum a počasí**: 12. srpna 1648 za úsvitu, **`weather: "fog"`** (ranní vltavská mlha: `-10 %` k zásahu na dálku, ostrý rozdíl mezi mlžným tokem řeky a ohněm hořícího pramu).
- **Premisa**: Švédský oddíl vypouští po Vltavě zápalný prám naložený sudy prachu (`bargeX: 4 → 14`) směrem k dřevěným kolům Staroměstských mlýnů. Říční ženisté mezitím přecházejí mělký kamenitý brod (`FORD_TILES`), aby vrhli kotevní háky a strhli prám přímo do mlýnice.
- **Protiběžné hodiny (Pilíř A)**:
  - *Hrozba*: Hořící prám postupuje o `+2` pole za každý švédský tah (nebo o `+3` pole, drží-li ženisté alespoň `1` kotevní hák). Při dosažení `bargeX >= 14` prorazí náhon a zapálí mlýnici (okamžitá porážka `loss: "mill_burned"`, stejně tak pokud `millBurningTurns >= 2` po opakovaných požárech moučného prachu).
  - *Obrana*: Obránci mají dvě rovnocenné cesty k vítězství — **hydrotechnickou** (otevřít obě stavidla a spláchnout prám přívalem vody) nebo **střeleckou** (prostřelit oba sudy na plujícím pramu dříve, než dorazí k mlýnským kolům).

---

## 2. Trojice obránců (`createMission4Units`)

| Postava (`id`) | Archetyp | HP / Zbroj / Pohyb | Výzbroj (`WEAPON_CATALOG` / `MELEE_CATALOG`) | Unikátní role |
| :--- | :--- | :--- | :--- | :--- |
| **Mistr Prokop Šípek** (`player-sipek`) · **VIP** | `commander` | `13 HP` · `1 Armor` · `5` polí/AP | `sipek_wheellock_pistol` (kolečková pistole, bezpečná v mouce) · `mill_pole_hook` (halapartnový hák s **Odhozením** o 1 pole) | Otevírá stavidlo za **`1` krok** (ostatní za `2`); seká kotevní hák za `1 AP`; jeho pád znamená porážku (`loss: "sipek"`). |
| **Klára z Lékárny u Zlatého orla** (`player-klara`) | `sniper` | `11 HP` · `0 Armor` · `5` polí/AP | `klara_apothecary_carbine` (přesná kolečková karabina, **bez doutnáku**) · `apothecary_knife` | **Octová rouška a obklad (`1 AP`, 2 náboje)**: Na sobě nebo sousedovi (Chebyshev $\le 1$) ruší `Zadýmení` + `Otřesený`, léčí `+4 HP` a čistí dým na jeho poli. |
| **Matyáš „Hrom“ Kovář** (`player-matyas`) | `trooper` | `15 HP` · `3 Armor` · `4` pole/AP | `matchlock_musket_fork` (těžká mušketa s furketou — **pozor: doutnák v nevyvětrané mlýnici zapálí moučný prach!**) · `forge_hammer` | Těžký kyrys (`Armor 3`) ho chrání před `Zadýmením`; za `1 AP` přerazí kotevní hák na břehu (`breakGrapple`). |

---

## 3. Švédský oddíl

- `enemy-sapper-1` (`(8, 0, 13)`), `enemy-sapper-2` (`(9, 0, 15)`): Říční ženisté (`ranger`, `8 HP`, `harrier_pistol` + `harrier_blade`). Postupují přes brod ke břehu `x = 11` a přihazují kotevní háky (`grappleCount: 0..2`).
- `enemy-bank-1` (`(7, 0, 10)`), `enemy-bank-2` (`(7, 0, 16)`): Mušketýři břehu (`trooper`, `9 HP`, `Armor 1`, `swedish_musket`). Pálí ze břehu přes vodu a mohou zapálit nevyvětraný moučný prach v mlýnici.
- `enemy-firemaster` (`(6, 0, 12)`): Velitel zápalného pramu (`commander`, `11 HP`, `Armor 1`, `swedish_musket`). Kryje postup pramu a navádí ženisty.

---

## 4. Geometrie bojiště (`24 × 28 × 3`, `RoofKind = "mill"`)

- **Vltava a mlýnský náhon (`x: 2..9, z: 6..20`)**: `water` (`walkable: false`), mimo mělký kamenitý brod:
  - `FORD_TILES`: `x: 8..10, z: 12..16` (`cobble`, `walkable: true` dokud `flooded === false`; při `flooded === true` se promění v hlubokou vodu `water`, `walkable: false`).
  - Plavební osa zápalného pramu: `bargeZ = 12`, `bargeX` od `4` do `14`.
- **Západní stavidlo**: `SLUICE_WEST = (10, 0, 10)` s oboustranným polovičním parapetem (`N`, `W`).
- **Krytá Staroměstská mlýnice (`x: 11..18, z: 9..17`, `y = 0..1`, `isEnclosedRoofed === true`)**:
  - Severní vrata `MILL_DOOR_N = (14, 0, 9)` a západní vrata `MILL_DOOR_W = (11, 0, 13)` (obojí `closed` na startu).
  - Ohniska moučného prachu `FLOUR_TILES`: `(13, 0, 12)`, `(14, 0, 12)`, `(13, 0, 14)`.
  - Vnitřní schodiště: `(16, 0, 16) <-> (16, 1, 16)` a `(17, 1, 16) <-> (17, 2, 16)`.
- **Vodárenská věž (`x: 15..18, z: 14..17`, `y = 0..2`)**:
  - `y = 1`: Sýpka a zdvihací strojovna s řetězovým stavidlem `SLUICE_TOWER = (16, 1, 14)`, okenními parapety směrem k řece (`x = 15, z: 13..15`, `W: "half"`).
  - `y = 2`: Koruna vodárenské věže s otevřeným parapetem (`W: "half"`, `N: "half"`) pro přímou palbu na sudy pramu.

---

## 5. Pravidla a deterministické testy (`scripts/test-mission4.ts`)

1. **Grid & Izolace**: Ověření brodu, uzavření mlýnice, střešních parapetů a izolace `RoofKind = "mill"` od Misí 1–3.
2. **Moučný prach a Průvanové odvětrání**: Výstřel doutnákovou mušketou v uzavřené mlýnici vyvolá výbuch prachu; kolečková karabina nikoliv; otevření vrat odvětrá mlýnici (`flourVented = true`) a potlačí vznícení.
3. **Hydrotechnické vítězství (`weir_flood`)**: Prokop otevře stavidlo za 1 krok, spojenec za 2; otevření obou zatopí brod, bezpečně posune obránce na břeh `(11, z)`, srazí Švédy z brodu a dosáhne `outcome === "victory", victoryReason === "weir_flood"`.
4. **Střelecké vítězství (`barge_sunk`)**: Klára z věže (`y = 2`) s přímým LoS sestřelí oba sudy (`bargeKegsRemaining: 2 → 0`) a potopí prám.
5. **Octová rouška a Odhození**: Klářin obklad odstraní `isChoking`, `isShaken`, léčí `+4 HP` a vyčistí kouř; Prokopovo bidlo (`mill_pole_hook`) odhodí sousedního ženistu zpět od břehu.
6. **Stavy porážky**: Náraz pramu (`bargeX >= 14`), dvoutahový požár mlýnice (`millBurningTurns >= 2`), pád Prokopa Šípka (`loss: "sipek"`).
7. **Zustand Store Integrace**: Ověření akcí storu (`operateMission4Sluice`, `breakMission4Grapple`, `shootMission4BargeKeg`, `useMission4VinegarCompress`, `douseMission4Fire`), přepínání scénářů (`mission1 ↔ mission4`) a i18n projekcí.
