# Praha 1648

Turn-based tactical strategy set in Prague during the Swedish siege of 1648. The player commands through Jesuit Father Jiří Plachý and the Železná vigilie — alongside Prague's guildsmen and defenders across four historical engagements: the palace escape of Field Marshal Colloredo (Mission 1), the defense of the Old Town Bridge Tower and Charles Bridge (Mission 2), the night sortie against the Swedish powder yard on Malá Strana (Mission 3), and the dawn defense of the Old Town Mills and water tower against an incendiary river barge (Mission 4).

## Language

### Battlefield Space & Visibility

**Patro** (*Floor Level*):
One of up to three vertical elevation planes on the battlefield: ground level, the elevated gallery or Piano Nobile, and the Maltese watchtower or Old Town tower gallery.
_Avoid_: Layer, z-index

**Přepínání pater** (*Floor Cutaway*):
The visual elevation filter allowing the commander to inspect lower interiors by ghosting upper roofs and floors without allowing camera inspection to reveal unseen rooms.
_Avoid_: Roof toggle, camera clip

**Zatemnění neprozkoumaných pater** (*Floor Cutaway Fog Blackout*):
The rule that unseen upper floors remain veiled in darkness even when the cutaway level rises, preventing scouting through solid ceilings.
_Avoid_: Black roof, cutaway shroud

**Krytý interiér** (*Enclosed Roofed Interior*):
Any roofed indoor room or vaulted arcade — including the Grand Priory halls, the garden belvedere vault, the Old Town Bridge Tower passage and windlass chamber, and the powder-yard store and lodge — where rain does not fall and black-powder smoke stagnates.
_Avoid_: Indoors boolean, roof mask

**Průvanové odvětrávání portálů** (*Through-Draft Portal Venting*):
The natural cross-draft near open exterior doors or breached facades that clears black-powder smoke twice as fast as sealed halls.
_Avoid_: Instant smoke clear

**Vnitřní stagnace kouře** (*Indoor Smoke Stagnation*):
The persistence of black-powder smoke inside enclosed rooms across multiple rounds while bleeding through open doorways, unlike outdoor smoke that rain disperses quickly.
_Avoid_: Infinite smoke

**Zadýmení** (*Black-Powder Choking*):
Sulfurous suffocation suffered by wounded or unarmored soldiers who end their turn inside smoky enclosed rooms, reducing mobility by one tile per AP on the following turn.
_Avoid_: Poison gas, toxic cloud

**Odolnost těžké zbroje proti zadýmení** (*Cuirassier Respiratory Resistance*):
The protection conferred by intact cuirass and helmet armor at full health, preventing sulfurous smoke choking indoors.
_Avoid_: Gas mask

**Barokní šerosvit** (*Baroque Chiaroscuro Fog of War*):
The Caravaggio-inspired three-state tactical visibility hierarchy contrasting unseen darkness, remembered architecture, and actively lit fields of view.
_Avoid_: Fog tint, shadow mask

**Zábleskový a zvukový kontakt** (*Muzzle Flash & Sound Contact*):
A temporary spatial cue revealing the position of a concealed musketeer's glowing matchcord, heavy footsteps, or distant gunfire without exposing health or silhouette.
_Avoid_: Full smoke reveal, sonar ping

**Nebeský světelný zdroj** (*Celestial Light Source*):
The dominant moonlit or low-dawn astronomical light anchoring shadows across the night sorties or the morning defense of Charles Bridge.
_Avoid_: Ambient sun, skybox light

**Praktické světlo** (*Practical Light*):
Grounded localized illumination tied to a real battlefield flame — candelabra, wrought-iron torches, skiff lanterns, lit matchcord, or muzzle flash — that dims outdoors in heavy rain.
_Avoid_: Ambient fill, orphan point light

**Sokl zdi** (*Wall Stub*):
A low masonry remnant shown where camera-facing high walls are tucked aside so interior cover lines remain legible.
_Avoid_: Wall footing, cut wall

**Vertikální světlík** (*Vertical Light Shaft*):
An open vertical shaft such as a courtyard well, archway, or stairwell through which light and sightlines pass between floors.
_Avoid_: Ceiling hole

### Turn Structure & Tactical Zones

**Akční bod (AP)** (*Action Point*):
A single measure of tactical effort (2 AP per full turn) spent to maneuver, aim, enter Střelecká hlídka, throw a petard, reload, or work objective mechanisms.

**Modrá zóna** (*Blue Zone*):
Tiles reachable for 1 AP of movement, leaving a soldier one remaining Action Point to shoot, throw a petard, reload, or set a watch.
_Avoid_: Short move, walk zone

**Zlatá zóna** (*Gold Zone*):
Tiles reachable only by spending both Action Points in an all-out dash, ending that unit's turn.
_Avoid_: Yellow zone, Far mark, run zone

**Přímá viditelnost** (*Line of Sight*):
Unobstructed 3D sightline evaluated directly over battlefield tiles and elevations, blocked by high walls, pillars, closed doors, and dense consecutive smoke.

**Kumulativní clona kouře** (*Cumulative Smoke Concealment*):
Dense concealment created when a sightline traverses two or more consecutive black-powder smoke tiles, blocking direct shots except from elevated marksmen or within point-blank contact range.
_Avoid_: Smoke invisibility

**Výjimka kontaktního dosahu v kouři** (*Point-Blank Proximity Rule*):
The exception allowing fighters immediately beside one another to detect and engage through dense smoke.
_Avoid_: Smoke melee bypass

**Průhled z výšky přes dým** (*Smoke Horizon Piercing*):
The elevated vantage rule enabling marksmen firing downward from an upper floor to spot and shoot through low ground smoke at a modest aim penalty.
_Avoid_: Smoke bypass, high vision

**Vyklonění přes balustrádu** (*Edge Peeking*):
The tactical rule letting a soldier stationed beside an upper-floor railing lean slightly outward to fire into lower courtyards without obstruction from their own floor.
_Avoid_: Balcony peek, edge lean

**Výšková převaha** (*High Ground Advantage*):
The accuracy bonus gained when shooting downward from an elevated floor toward a lower target.
_Avoid_: Elevation bonus, height buff

**Predikce průzkumu na schodišti** (*Stairway Recon Preview*):
Movement hover reconnaissance predicting which upper-floor enemies and sightlines will come into view upon climbing stairs.
_Avoid_: Stair preview, ladder check

**Prediktivní zaměřovač cílů** (*Pre-Move LoS Crosshair*):
Real-time target preview showing weapon range and cover state from a hovered movement destination before committing a move.
_Avoid_: Move target preview

### Combat, Firearms & Critical States

**Střelecká hlídka** (*Overwatch*):
A reactionary ambush stance held between turns: wheellock weapons guard full 360° arcs while matchlocks hold a focused 90° cone (**Připravená salva**), broken by dense smoke or loss of Action Points.
_Avoid_: Overwatch, Guard, Sentry mode

**Připravená salva** (*Prepared Volley Cone*):
The directional 90° forward ambush sector held exclusively by matchlock muskets on Střelecká hlídka.
_Avoid_: Cone overwatch

**Petarda** (*Incendiary Grenade / Petard*):
A cast-iron siege bomb exploding across a 3×3 area, shredding two points of armor, blasting black-powder smoke outward, and detonating adjacent powder kegs.
_Avoid_: Granát, Frag, Pipe bomb

**Rázová vlna výbuchu** (*Blast Shockwave Displacement*):
Explosive pressure that clears smoke from the immediate epicenter while driving a thick soot and dust ring into surrounding tiles and scarring floor masonry around tile edges.
_Avoid_: Explosion blow, smoke despawn

**Organické šíření prachu a dýmu** (*Causal Combat Diffusion*):
Atmospheric combat diffusion where indoor and courtyard plaster dust, soot, and embers remain absent until real gunfire or explosions erupt and radiate outward.

**Furketa** (*Musket Rest / Fork*):
A heavy wooden fork stand stabilizing heavy matchlock muskets for deliberate 2-AP aimed shots; shooting hurriedly after moving (**střelba od boku**) costs 1 AP at steep inaccuracy and leaves the shooter Otřesený.

**Odlehčená mušketa M1624** (*Lightened Offhand Musket*):
Modernized 1624 Swedish matchlock fired directly from the shoulder without a wooden **Furketa**, reloaded with paper cartridges from a waist *patronkök* and exhibiting faster sight alignment alongside sharper upward muzzle climb.

**Fázové nabíjení** (*Segmented Reload*):
Progressively charging complex 17th-century muzzle-loading firearms step by step across turns (2 AP for lighter Swedish muskets with paper cartridges, 4 AP for heavy imperial matchlocks), interrupted only if a soldier strikes with a musket butt while partially loaded.

**Šance na selhání výstřelu** (*Misfire Chance*):
The probability that damp powder or a sputtering matchcord causes a weapon to fizzle harmlessly at the pan instead of discharging, markedly lower for wheellock mechanisms and eliminated for defenders shooting from enclosed dry rooms.

**Kyrys, průraz a zničení zbroje** (*Armor Cuirass, Pierce & Shred*):
Protective steel plating absorbing incoming bullet damage and cutting critical hit odds, bypassed by armor-piercing rounds or permanently stripped away by armor shredding.

**Obchvat** (*Flanking*):
Attacking a target from an angle unguarded by intervening walls or cover, yielding sharp hit and critical bonuses.
_Avoid_: Backstab, Uncovered shot

**Otřesený** (*Shaken*):
A rattled combat condition inflicted by staggering critical hits, pistol butts, or hurried hip-fire that penalizes accuracy until the end of the turn.
_Avoid_: Suppressed, Panicked

**Poslední vzepětí** (*Death Throes*):
The universal agonal stand entered by any soldier reduced to 0 HP or below without suffering instant overkill, granting one final turn of desperate action before collapsing — during which enemy troops may strike with musket butts but cannot detain the Field Marshal.
_Avoid_: Bleeding out, downed state, second wind

**Zadržen** (*Detained*):
A one-turn capture threat triggered when an unescorted enemy reaches Marshal Colloredo and demands his surrender with zero AP left to abduct him immediately, giving Prague defenders one turn to intervene before **Zajetí**.
_Avoid_: Rooted, Stunned VIP

**Zajetí** (*Captured*):
Swedish capture of Field Marshal Colloredo — either immediately by an enemy with spare AP at gunpoint/melee reach, or after holding him Zadržen across a full turn without escort rescue — ending Mission 1 in defeat.
_Avoid_: VIP killed, Hostage fail

**Vyproštění** (*Rescue*):
Freeing Marshal Colloredo from Swedish detention by moving an active companion beside him, killing or driving off his captor, or shielding him with Jan Matěj's cloak oath.

### The Iron Vigil & Campaign Structure

**Železná vigilie** (*The Iron Vigil / Fidelitas Ferrea*):
The sworn defenders organized at the Klementinum by Jesuit Father Jiří Plachý across Prague's estates — students, butchers, rogues, and pious knights — bound by blood and iron to hold Prague against Sweden.
_Avoid_: Jesuit militia, mercenary band

**Jiří Plachý**:
The Jesuit scholar-commander who directs the Iron Vigil from the Klementinum, leads the defense of the Bridge Tower, and sails on the night powder-yard sortie; his fall loses any mission he leads.
_Avoid_: Central, Off-screen commander

**Klementinum**:
The Jesuit college in Prague's Old Town serving as the spiritual and intellectual anchor of the Iron Vigil, uniting Catholic devotion with 17th-century optics and ballistics (**Víra a věda**).
_Avoid_: Avenger, Strategic HQ

**Mise** (*Mission*):
One playable historical operation of the 1648 campaign (Mise 1: Útěk polního maršála, Mise 2: Mříž, Mise 3: Doutnák, Mise 4: Jez a mlýnice).
_Avoid_: Stage, Level, Scenario (in player-facing speech)

**Kronika tažení** (*Campaign Chronicle*):
Persistent campaign record carried in the current browser tab tracking the lone Mission 1 survivor and the Mission 2 oath outcomes for Havel Řezáč and Ondřej Štěrba.
_Avoid_: Save file, Profile, Account

**Památka Železné vigilie** (*Iron Vigil Perks*):
Honors forged through Mission 1's Paradoxní oběť — **Malostranský pyrotechnik** (Brother Bartoloměj), **Klementinská horlivost** (Václav z Michalovic), and **Ocelová věrnost** (Jan Matěj) — recorded in the chronicle at the end of Mission 1 without transferring to Mission 2 or 3.

**Zvláštní aktivované schopnosti** (*Hero Special Abilities*):
Four dormant heroic abilities (Věrná stráž, Svatováclavský ortel, Maltézská petarda, Rozkaz polního maršála) intentionally disabled during Mission 1's opening escape while tactical verbs focus cleanly on musketry, reload cadence, and cover.

### Mission 1: Escape of the Marshal

**Útěk k řece / Rybářská pramice** (*Fisherman's Skiff & Escape Zone*):
The moored river skiff on the Čertovka dock where reaching safety with Marshal Colloredo un-detained achieves tactical extraction.

**Paradoxní oběť** (*Paradoxical Martyrdom*):
The concluding moral dilemma after escaping the Grand Priory in which the player designates who holds the palace gate: the chosen rearguard miraculously survives into legend while the escaping companions fall covering Colloredo's boat.
_Avoid_: Random casualty, Cutscene wipe

**Zranění z Lützenu** (*Marshal's War Handicap*):
Field Marshal Colloredo's permanent 1632 battlefield limp limiting him to 3 movement tiles per AP regardless of nearby companions.

**Autorita polního maršála** (*Marshal Command Aura*):
Bohemia's supreme commander steadying nearby imperial defenders within seven tiles with an +8% accuracy bonus.

**Prachový sud** (*Explosive Powder Keg*):
Volatile black-powder barrels detonating across a 3×3 blast zone when struck by gunfire, petards, or neighboring explosions.

### Mission 2: The Portcullis

**Mise 2: Mříž** (*The Portcullis*):
The dawn defense of the Old Town Bridge Tower on 26 July 1648 by Jiří Plachý, Havel Řezáč, and Ondřej Štěrba before Charles Bridge falls.
_Avoid_: Mission 1 roster

**Ochrana věže** (*Tower Ward*):
The protective Marian grace anchored to the Old Town tower archway (*Signa te, signa…*) blocking demonic Swedish harriers from crossing the **Práh** (*Threshold*) onto the square.
_Avoid_: Magic barrier, Spell slot

**Harcovník** (*Swedish Harrier*):
Swift demonic foot-skirmishers racing across Charles Bridge to hurl smolné láhve at the windlass and press defenders at the Threshold.
_Avoid_: Cavalry, Ordinary musketeer

**Švédský okultista** (*Swedish Occultist*):
The ritualist advancing behind the harriers to perform a three-turn **Obřad** (*Unbinding Rite*) on the threshold keystone unless wounded, displaced, or slain.
_Avoid_: Odowalsky, Demon prince

**Pokleknutí u nápisu** (*Kneeling at the Inscription*):
Plachý's once-per-mission prayer beneath the Latin Marian inscription on the upper gallery, extending the Tower Ward's resistance against the Unbinding Rite by one additional turn.

**Naviják a Přetnutí lana** (*Windlass & Hoisting Cable Severing*):
Unpinning the heavy timber windlass pawl (1 turn for Ondřej Štěrba, 2 turns for allies) and cutting the hemp cable with a blade on the middle chamber floor to drop the iron portcullis and seal Charles Bridge.

**Smolná láhev** (*Incendiary Pitch Flask*):
Flaming pitch hurled from the Threshold that burns the wooden windlass each round unless doused for 1 AP by an adjacent defender.
_Avoid_: Molotov cocktail

**Přísaha po Mříži** (*Oath after the Tower*):
The post-victory induction offering blood-and-iron membership in the Železná vigilie to surviving defenders Havel Řezáč and Ondřej Štěrba before the Mission 3 night sortie.

### Mission 3: The Matchcord

**Mise 3: Doutnák** (*The Matchcord*):
The night sortie of 27/28 July 1648 across the Čertovka in a small **pramice výsadku** (*sortie skiff*) led by Father Plachý alongside sworn brothers Havel Řezáč and Ondřej Štěrba (or borrowed **Žáci Klementina**).
_Avoid_: Petřín magazine, Second palace rescue

**Tichý příchod** (*Silent Approach*):
The initial night infiltration state held until broken by gunfire, explosions, melee blows, lighting the cord, cutting cart tackle, or stepping into watch-torch rings.
_Avoid_: Stealth statistic

**Doutnáková stopa a Jiskra** (*Matchcord Train & Spark*):
A waxed powder fuse laid tile by tile across empty cobblestones (two tiles per AP by Ondřej Štěrba) toward the coach-house store door, lit once by Plachý so its advancing **Jiskra** cooks off the yard before three **Káry** (*powder carts*) reach the battery gate.

**Zašlápnutí** (*Stamping the Spark*):
A telegraphed threat where a Swedish soldier ending his turn beside the live spark prepares to stamp it out on the next Swedish turn unless slain, pushed away (**Odhození**), or blasted off that tile.

**Odhození** (*Powder Yard Displacement*):
Local one-tile knockback forcing surviving defenders or Swedes aside from melee strikes or powder blasts inside the yard, enabling stamp disruption without killing.

**Dělmistr a Kartáčový kužel** (*Master Gunner & Canister Cone*):
The Swedish gunner traversing a falconet behind yard gabions once silence breaks, telegraphing a **kartáčový kužel** before raking all exposed tiles each subsequent turn.

**Vzplanutí dvora a Jizva kroniky** (*Cook-off & Chronicle Scar*):
The catastrophic store detonation charring the powder yard while Father Plachý extracts to the skiff, recording whether zero deliveries muted the battery or 1–2 deliveries left a **jizva kroniky** (*chronicle scar*) at dawn.

### Mission 4: Weir and Millhouse (ADR-0025)

**Mise 4: Jez a mlýnice** (*Weir and Millhouse*):
The foggy dawn defense of the Old Town Mills (*Staroměstské mlýny*) and wooden water tower on 12 August 1648 led by head miller Mistr Prokop Šípek, apothecary Klára z Lékárny u Zlatého orla, and water-tower smith Matyáš „Hrom“ Kovář.

**Zápalný prám** (*Incendiary Fire-Barge*):
A drifting Swedish barge loaded with pitch garlands and two volatile powder kegs descending the Vltava millrace (`bargeX: 4 → 14`) toward the mill waterwheels unless sunk by gunnery or swept aside by opening both sluices.

**Stavidlo a Zaplavení brodu** (*Sluices & Weir Flood*):
Operating both the riverbank sluice and the tower hoist chain to unleash the millrace surge, sweeping the fire-barge clear (`weir_flood` victory) while transforming shallow ford cobblestones (`x: 8..10, z: 12..16`) into impassable deep water and washing enemy forders westward.

**Moučný prach a Odvětrání mlýnice** (*Flour Dust Ignition & Mill Venting*):
Airborne flour inside the sealed Old Town millhouse that detonates when a **matchlock** firearm discharges indoors, igniting the mill unless wheellock weapons are used or at least one exterior mill door is opened for **Průvanové odvětrávání portálů**.

**Kotevní hák a Říční ženisté** (*Anchor Grapples & River Sappers*):
Grappling lines thrown from the mill bank by Swedish river sappers to accelerate the fire-barge (`+3` tiles per turn instead of `+2`), broken by steel or pole-hook strikes (**Odhození**).

**Octová rouška a obklad** (*Apothecary Vinegar Compress*):
Klára's medicinal field compress clearing **Zadýmení** and **Otřesený**, restoring four health points, and dispersing black-powder smoke around an adjacent or self-targeted defender.

### Presentation, Visuals & Camera

**Kinematická akční kamera** (*Cinematic Action Cam*):
The dynamic four-state camera framing Tactical Isometric View, low Over-the-Shoulder Sprint Cam on dashes and breaches, mid-movement Pod Reveal and Overwatch Slow-Mo interrupts, and Cover Settle Reset.

**Filmový banner tahu** (*Turn Splash Banner*):
The brief center-screen initiative transition announcing Prague's defenders or Swedish forces before fading into the Mission Status Chip.

**Komando a rozhraní** (*Command HUD*):
Floating minimal Baroque instruments comprising the **Tactical Action Ribbon**, **Mission Status Chip**, **Tactical Utilities Capsule**, **Combat Chronicle Feed**, **Tutorial Order Banner**, **Tactical Advisor Widget**, and **Inspect Dossier** (`F1` / `0`).

**Jazyk tvarů** (*Top-Down Class Silhouettes*):
Strict silhouette differentiation across all five martial classes — ranger poles/valet cleavers, wide plumed sniper hats and capes, broad armored cuirassier pauldrons, sectoid censers and back-banners, and Marshal Colloredo's gilded command cuirass and crimson sash — with hats seated physically low across the brow.

**Loutková 2D kostra a kinematika** (*2D Cut-Out Skeletal Rig*):
Hierarchical 2D canvas skeletal animation (`swedishRig2D.ts` / `swedishCanvasRenderer.ts`) rendering all 18 Prague defender and Swedish troop profiles with analytical 2-bone IK arms, damped cloth/bandolier springs, Colloredo's asymmetric Lützen limp, camera-relative facing flips, and synchronized HUD bust portraits.

**Pravidlo barev 60-30-10** (*60-30-10 Color Rule*):
Scene color discipline keeping 60% calm desaturated ground and atmosphere, 30% secondary stone/timber architecture, and reserving 10% saturated royal gold, scarlet crimson, cobalt blue, and torch amber strictly for units, active cover, explosives, and objectives.

**Biomy bojiště** (*Environmental Biomes*):
Distinct physical states separating the intact **Nevypleněný honosný palác** (polished limestone and cardinal carpet), the **Zaprášená malostranská zahrada a dvůr** (slate-mud cobblestones and mossy sandstone), the flowing **Vltava** with **ranní sluneční odlesk**, and **Zdevastovaná rozstřílená ruina** (battle-scarred perimeter masonry leaving tile centers clean and readable).
