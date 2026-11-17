import type { FormatContext, MessageFn } from "./types";

const nom = (ctx: FormatContext, id?: string) => ctx.unit(id, "nom");
const acc = (ctx: FormatContext, id?: string) => ctx.unit(id, "acc");

/**
 * HUD copy and guided-tutorial strings outside the core battle-log catalog.
 * A new locale implements these keys alongside `csMessages`.
 */
export const csUiMessages = {
  "ui.sacrifice.matej.perkName": () => "Ocelová věrnost",
  "ui.sacrifice.bart.perkName": () => "Maltézský pyrotechnik",
  "ui.sacrifice.vaclav.perkName": () => "Klementinský zápal",

  "ui.capture.done": () => "Zajetí dokonáno · 2/2 kola zadržení",
  "ui.capture.shackled": () => "Švédští dragouni spoutali maršála Colloreda!",
  "ui.epilogue.again": () => "Hrát znovu",
  "ui.epilogue.wipe.heading": () => "Odowalského zrada odražena:",
  "ui.epilogue.wipe.body": () =>
    "Švédský přepadový oddíl byl v zahradě Velkopřevorství do jednoho pobit! Cesta k rybářské pramici na Čertovce je zcela volná. Maršál Colloredo bezpečně přeplouvá rozvodněnou Vltavu, aby na pravém břehu zorganizoval legendární obranu Prahy.",
  "ui.epilogue.defeat.surrounded": () =>
    "Obklíčen bez ochranky a zajat (Kořist a výkupné):",
  "ui.epilogue.defeat.fallen": () => "Družina padla a maršál zůstal v moci Švédů:",
  "ui.epilogue.defeat.down": () =>
    "Podlehl smrtelným zraněním v boji:",
  "ui.epilogue.defeat.surroundedBody": () =>
    "Švédští vojáci pronikli přímo k nechráněnému maršálu Rudolfu Colloredovi bez ochrany jeho družiny. Maršál byl v noční košili odzbrojen a spoután pro královské výkupné (100 000 říšských tolarů).",
  "ui.epilogue.defeat.fallenBody": () =>
    "Všichni věrní obránci z maršálova doprovodu v zahradě Velkopřevorství padli. Zraněného polního maršála Rudolfa Colloreda už neměl kdo vyprostit ze švédského obklíčení a dragouni jej odvlekli v poutech.",
  "ui.epilogue.defeat.downBody": () =>
    "Těžce raněný polní maršál Rudolf Colloredo v Posledním vzepětí nedokázal dosáhnout rybářské pramice a podlehl svým zraněním (100 000 říšských tolarů výkupného zůstalo Švédům odepřeno, ale Praha přišla o velitele).",
  "ui.epilogue.defeat.coda": () =>
    "Stejně jako na Hradčanech a Malé Straně, kde padlo do zajetí přes 200 šlechticů včetně kardinála Harracha a purkrabího Martinice, ztratila Praha svého vrchního velitele — nikdo nezorganizoval posádku na Karlově mostě včas a celá Praha padla do rukou generála Königsmarcka!",

  "ui.splash.round": (p) => `Kolo ${p.count ?? 0} · Anno 1648`,
  "ui.splash.player": () => "Útěk maršála Colloreda",
  "ui.splash.enemy": () => "Přepad Odowalského",
  "ui.splash.player.r3": () => "Polnice z Mostecké ulice! Těžké švédské posily dorazí v kole 5!",
  "ui.splash.player.r4": () =>
    "POZOR: Švédská jízda obkličuje bránu — posily vtrhnou v příštím kole!",
  "ui.splash.player.r5": () => "POPLACH: Švédská jízda generála Königsmarcka vpadla do zahrady!",
  "ui.splash.player.escort": () =>
    "Eskortujte kulhajícího maršála k rybářské pramici na Čertovce!",
  "ui.splash.enemy.body": () => "Švédští dragouni prohledávají zahradu Velkopřevorství!",

  "ui.mission.aria": () => "Stav mise a kolo",
  "ui.mission.drag": () => "Tažením myší můžete stužku stavu mise odsunout",
  "ui.mission.round": (p) => `Kolo ${p.count ?? 0}`,
  "ui.mission.defenders": () => "Obránci",
  "ui.mission.swedes": () => "Švédové",
  "ui.mission.detainedTip": (p) =>
    `POZOR: Maršál Colloredo je zadržen Švédy (${p.progress ?? 0}/2 kola)!`,
  "ui.mission.boatTip": (p) =>
    `Vzdálenost maršála Colloreda k rybářské pramici na Čertovce: ${p.distance ?? 0} polí`,
  "ui.mission.detained": (p) => `Maršál ZADRŽEN (${p.progress ?? 0}/2)`,
  "ui.mission.boat": () => "Pramice",
  "ui.mission.escape": () => "ÚNIK!",
  "ui.mission.reinforcementHere": () =>
    "Švédská jízda generála Königsmarcka vtrhla severní branou do zahrady!",
  "ui.mission.reinforcementIn": (p) =>
    `Švédské jízdní posily dorazí za ${p.count ?? 0} kola`,
  "ui.mission.reinforcementGarden": () => "Posily v zahradě!",
  "ui.mission.reinforcement": () => "Posily",
  "ui.mission.enemyTipSeen": (p) =>
    `Zbývá ${p.count ?? 0} Švédů (${p.required ?? 0} v přímém dohledu)`,
  "ui.mission.enemyTip": (p) => `Zbývá ${p.count ?? 0} Švédů`,
  "ui.mission.enemies": () => "Švédů",
  "ui.mission.seen": (p) => `(${p.count ?? 0} vid.)`,
  "ui.mission.weatherCycle": (p) => `Přepnout počasí: ${p.names ?? ""}`,
  "ui.weather.rain.short": () => "Liják",
  "ui.weather.fog.short": () => "Mlha",
  "ui.weather.clear.short": () => "Jasno",
  "ui.mission.reset": () => "Vrátit stužku na výchozí místo",
  "ui.mission.expand": () => "Rozbalit stav mise",
  "ui.mission.collapse": () => "Sbalit stav mise",

  "ui.camera.action": () => "Akční kinematická kamera [C]",
  "ui.render.mode": () => "Přepnout 2D sprity / 3D modely [M]",
  "ui.fullscreen": () => "Celá obrazovka [F]",
  "ui.advisor.toggle": () => "Taktický rádce [H]",
  "ui.battle.restart": () => "Restartovat bitvu",
  "ui.floors.sectionAria": () => "Průřez pater bojiště",
  "ui.floors.section": () => "Průřez pater",
  "ui.floors.sight": (p) => `· Dohled ${p.distance ?? 0} polí`,
  "ui.floors.cycle": () => "[V] Přepnout",
  "ui.contact.mark": () => "[?] Kontakt",
  "ui.contact.fog": () => "Kontakt v šerosvitu",
  "ui.contact.approach": (p) =>
    `${p.names ?? ""} — Přibližte se s jednotkou nebo vystoupejte výše pro odhalení cíle`,

  "ui.chronicle.heading": (p) => `Diarium Belli (${p.count ?? 0})`,

  "ui.portrait.named": (p) => `Portrét postavy ${p.names ?? ""}`,
  "ui.portrait.archetype": (p) => `Portrét typu ${p.names ?? ""}`,
  "ui.portrait.vip": () => "VIP Hrdina (Vyžaduje ochranu)",

  "ui.cover.full": () => "Plný kryt (−40 % k šanci nepřítele na zásah)",
  "ui.cover.half": () => "Poloviční kryt (−20 % k šanci nepřítele na zásah)",
  "ui.cover.none": () => "Bez krytu (0 % obranný bonus)",

  "ui.tutorial.aria": () => "Rozkaz velení tutoriálu",
  "ui.tutorial.tip.collapse": () => "Sbalit taktickou nápovědu",
  "ui.tutorial.tip.expand": () => "Rozbalit detailní taktickou nápovědu",
  "ui.tutorial.tip.hide": () => "Skrýt radu",
  "ui.tutorial.tip.show": () => "Taktická rada",
  "ui.tutorial.skip": () => "Přeskočit skriptovaný výcvik a přejít přímo do volného boje [Shift+H]",
  "ui.tutorial.skipLabel": () => "Přeskočit výcvik",
  "ui.tutorial.minimize": () => "Minimalizovat rádce [H]",
  "ui.tutorial.enemyTurn": () => "Tah Švédů...",
  "ui.tutorial.lesson": () => "Taktické ponaučení:",

  "ui.advisor.aria": () => "Taktický rádce",
  "ui.advisor.drag": () => "Tažením lze rádce posunout",
  "ui.advisor.chip": (p) => `Rádce ${p.count ?? 1}/4:`,
  "ui.advisor.collapse": () => "Sbalit rádce",
  "ui.advisor.expand": () => "Rozbalit rady pro tento krok",
  "ui.advisor.collapseLabel": () => "Sbalit",
  "ui.advisor.detail": () => "Detail",
  "ui.advisor.reset": () => "Vrátit na výchozí místo",
  "ui.advisor.close": () => "Zavřít rádce [H]",
  "ui.advisor.next": () => "Další",
  "ui.advisor.done": () => "Hotovo",
  "ui.advisor.1.title": () => "Ovládání XCOM 2: LKM Výběr · PKM Pohyb",
  "ui.advisor.1.dialogue": () =>
    "Vaše Excelence! Po těch sedmi střelných ranách u Lützenu těžce kulháte a sotva stojíte na nohou! Zůstanu při vás a budeme se krýt za zídkami zahradou k Čertovce!",
  "ui.advisor.1.t1": () =>
    "Levé tlačítko (LKM): Kliknutím na vojáka jej aktivujete a ovládáte ikony schopností ve spodní liště.",
  "ui.advisor.1.t2": () =>
    "Pravé tlačítko (PKM — Move / Dash): Umístěte kurzor na políčko v modré (1 AP) nebo zlaté (2 AP) zóně a klikněte pravým tlačítkem — voják se okamžitě vydá na cestu.",
  "ui.advisor.1.t3": () =>
    "Postih „Těžké kulhání“: Zraněný maršál Colloredo ujde kvůli starým zraněním z Lützenu jen 3 pole za 1 AP.",
  "ui.advisor.1.t4": () =>
    "Ochrana maršála & Zajetí: Švédové po hraběti nikdy nestřílí (chtějí jej živého pro výkupné), ale zajmou jej za 1 AP těsně vedle něj nebo do 3 polí s nabitou zbraní! Na družinu nebudou střílet, pokud stojí do 3 polí od hraběte a střelec hraběte vidí.",
  "ui.advisor.1.t5": () =>
    "Cíl eskorty: Probojujte se s maršálem Colloredem skrz zahradu plnou švédských hlídek k rybářské pramici na Čertovce!",
  "ui.advisor.2.title": () => "Střelba, Hlavy cílů & Zteč zblízka (PKM)",
  "ui.advisor.2.dialogue": () =>
    "Pozor, pane! Švédští mušketýři mají odlehčené gustaviánské muškety M1624, zatímco naši obránci mohou nepřítele ztečovat i chladnou zbraní!",
  "ui.advisor.2.t1": () =>
    "Výběr cíle (LKM): V režimu střelby [2] levým kliknutím na ikonu hlavy nepřítele v pravém dolním rohu přepínáte mezi viditelnými cíli.",
  "ui.advisor.2.t2": () =>
    "Útok zblízka (XCOM 2 — PKM): Pravým kliknutím přímo na nepřítele v dosahu provedete okamžitý přesun spojený se seknutím — samotný útok už nestojí další AP navíc!",
  "ui.advisor.2.t3": () =>
    "Zrušení akce (PKM): Pravé tlačítko v menu střelby či petardy akci zruší a vrátí vás na bojiště.",
  "ui.advisor.3.title": () => "Fázové nabíjení, Petardy (LKM) & Sudy",
  "ui.advisor.3.dialogue": () =>
    "Moje těžká mušketa potřebuje na nabití 4 AP, švédská s papírovými patronami jen 2 AP — nabíjet však můžeme postupně po 1 AP mezi přesuny!",
  "ui.advisor.3.t1": () =>
    "Fázové nabíjení po 1 AP [R]: Investujte 1 AP do kroku nabíjení a za druhý AP ustupte pravým tlačítkem do krytu.",
  "ui.advisor.3.t2": () =>
    "Házení petard [4]: Po zvolení petardy v liště zamíříte a levým kliknutím (LKM) hod potvrdíte (pravým kliknutím zrušíte).",
  "ui.advisor.3.t3": () =>
    "Prachové sudy: Trefa nebo petarda odpálí sud na ploše 3×3. Maják označuje nejbližší sud u paláce.",
  "ui.advisor.4.title": () => "Schodiště, Patra paláce & Pramice",
  "ui.advisor.4.dialogue": () =>
    "Za zahradou teče Čertovka! Rybář čeká s pramicí u dřevěného mola. Využijte schodiště do 1. patra i na Maltézskou věž pro palebnou převahu!",
  "ui.advisor.4.t1": () =>
    "Schodiště [V / PgUp / PgDn]: Výšková převaha z 1. a 2. patra přidává +15 % k zásahu a rozšiřuje dohled.",
  "ui.advisor.4.t2": () =>
    "Cíl mise: Doveďte maršála Colloreda na únikové molo k pramici na Čertovce!",
  "ui.advisor.4.dock": (p) =>
    `Cíl mise: Doveďte maršála Colloreda na molo [${p.x ?? 0}, ${p.y ?? 0}, ${p.z ?? 0}] k pramici na Čertovce!`,

  "ui.door.closePortal": () => "Zavřít portál (0 AP)",
  "ui.door.openPortal": () => "Otevřít dvoukřídlý portál (0 AP)",
  "ui.door.close": () => "Zavřít dveře (0 AP)",
  "ui.door.open": () => "Otevřít dveře (0 AP)",
  "ui.stair.climb": (p) =>
    `Pravým/levým kliknutím vyběhnout/seběhnout po schodišti do patra P${p.floor ?? 0} (${p.count ?? 0} AP)`,
  "ui.stair.look": (p) => `Kliknutím přepnout pohled kamery do patra P${p.floor ?? 0}`,
  "ui.recon.los": () => "Počet nepřátel v přímé palebné linii z této dlaždice",
  "ui.recon.revealed": () => "Nově odhalení nepřátelé v šerosvitu",
  "ui.grenade.throw": () => "💥 LKM: Hodit petardu (3×3)",
  "ui.grenade.out": () => "Mimo dosah hodu (>8 polí)",
  "ui.grenade.back": () => "PKM: Zpět",
  "ui.boat.certovka": () => "Pramice na Čertovce",
  "ui.boat.m3": () => "Pramice výsadku",

  "ui.loss.captured": () => "ZAJAT! (2/2)",
  "ui.loss.detained": (p) => `ZADRŽEN (${p.progress ?? 1}/2)`,
  "ui.loss.volley": (p) =>
    p.chance === undefined ? "PALBA" : `PALBA · ${p.chance}%`,
  "ui.loss.throesBadge": (p) => `VZEPĚTÍ (${p.hp ?? 0} HP)`,
  "ui.loss.cuirass": (p) => `KYRYS (${p.count ?? 0})`,
  "ui.loss.shaken": () => "OTŘESEN",
  "ui.overwatch.active": () => "Střelecká hlídka aktivní",

  "ui.inspect.hidden": () =>
    "Jméno, zbraň a schopnosti zůstávají skryté, dokud postavu neuvidíte.",
  "ui.inspect.cover": () => "Kryt proti střelbě",
  "ui.inspect.occupant": (p) =>
    `Na poli stojí ${p.names ?? ""}. Klepněte na postavu pro její list.`,
  "ui.inspect.glance": (p) => `${p.names ?? ""} · hledí ${p.facing ?? ""}`,
  "ui.inspect.firearm": () => "Palná zbraň",
  "ui.inspect.melee": () => "Zbraň nablízko",
  "ui.inspect.abilities": () => "Schopnosti a stavy",

  "ui.ribbon.soldierAria": () => "Status vybraného vojáka",
  "ui.ribbon.medallionDrag": () =>
    "Tažením lze medailon posunout · Kliknutím nebo klávesou [Tab] přepnete vojáka",
  "ui.ribbon.squadTip": (p) => {
    const hp = `${p.hp ?? 0}/${p.required ?? 0}`;
    const vitals = p.agony ? `V POSLEDNÍM VZEPĚTÍ: ${hp}` : hp;
    const ended = p.open ? "" : " — Tah ukončen";
    return `${p.names ?? ""} (${vitals} HP, ${p.count ?? 0} AP)${ended}`;
  },
  "ui.ribbon.nextSoldier": () => "Další dostupný voják čety [Tab]",
  "ui.ribbon.pistolEmpty": () => "Vybitá",
  "ui.ribbon.reload": (p) => `Nabití ${p.progress ?? 0}/${p.required ?? 0}`,
  "ui.ribbon.health": (p) => `Zdraví: ${p.hp ?? 0}/${p.required ?? 0}`,
  "ui.ribbon.armor": (p) => `Zbroj: ${p.armor ?? 0}/${p.required ?? 0}`,
  "ui.ribbon.ap": (p) => `Akční body: ${p.count ?? 0}/${p.required ?? 0} AP`,
  "ui.ribbon.targetsAria": () => "Viditelné cíle v dohledu",
  "ui.ribbon.prevTarget": () => "Předchozí cíl [Shift+Tab]",
  "ui.ribbon.nextTarget": () => "Další cíl [Tab]",
  "ui.ribbon.targetTip": (p) =>
    `${p.names ?? ""} · ${p.chance ?? 0}% zásah (LKM: Zaměřit cíl)`,
  "ui.ribbon.barAria": () => "Taktická akční lišta",
  "ui.ribbon.noLos": () => "Žádný cíl v přímém dohledu",
  "ui.ribbon.backAim": () => "Zpět (PKM / Esc)",
  "ui.ribbon.hitBreak": () => "Rozpad zásahu",
  "ui.ribbon.breakdown": () => "Rozpad",
  "ui.ribbon.breakdownTip": () => "Zobrazit matematický rozpad bonusů a postihů",
  "ui.ribbon.cancelAim": () => "Zrušit míření [Pravé tlačítko myši / Esc]",
  "ui.ribbon.fire": () => "PAL!",
  "ui.ribbon.fireCost": (p) => `${p.count ?? 1} AP · [LKM / ⎵]`,
  "ui.ribbon.critArmor": () => "Krit & Kyrys",
  "ui.ribbon.noMelee": () => "Žádný nepřítel na sousední dlaždici",
  "ui.ribbon.backMelee": () => "Zpět (Esc)",
  "ui.ribbon.meleeHead": (p, ctx) => `Zblízka · ${ctx.melee(p.meleeId)}`,
  "ui.ribbon.strike": () => "ÚDER!",
  "ui.ribbon.strikeCost": () => "1 AP · [⎵]",
  "ui.ribbon.dockDrag": () => "Tažením lze lištu akcí odsunout",
  "ui.ribbon.resetLayout": () => "Obnovit rozložení lišty",
  "ui.ribbon.move.title": () => "Taktický přesun & Sprint",
  "ui.ribbon.move.cost": () => "1–2 AP",
  "ui.ribbon.move.summary": (p) =>
    `Pravým tlačítkem myši (PKM) na políčko okamžitě vyšlete vojáka na cestu. Modrá zóna (1 AP): Běžný přesun (${p.count ?? 4} polí). Zlatá zóna (2 AP): Sprint.`,
  "ui.ribbon.move.detail": () =>
    "XCOM 2 Zteč: Pravým klikem přímo na nepřítele v dosahu provedete okamžitý přesun spojený se seknutím (+0 AP navíc)!",
  "ui.ribbon.move.blocked": () => "Nyní nelze zadat rozkaz",
  "ui.ribbon.move.noAp": () => "Voják již nemá žádné volné akční body (tah ukončen)",
  "ui.ribbon.move.aria": () => "Pohyb [1]",
  "ui.ribbon.fireTitle": (p, ctx) => `Palba: ${ctx.weapon(p.weaponId) || "Střelná zbraň"}`,
  "ui.ribbon.fireEnds": (p) => `${p.count ?? 1} AP (ukončuje tah)`,
  "ui.ribbon.shoot.summary": (p) =>
    `Výstřel z pušky/muškety ukončuje tah vojáka. Zranění ${p.damage ?? 4}–${p.required ?? 6} HP · Průraz zbroje ${p.armor ?? 1} · Dostřel ${p.distance ?? 12} polí.`,
  "ui.ribbon.shoot.detail": () =>
    "LKM na ikonu hlavy nepřítele vpravo dole přepíná cíle · PKM míření zruší.",
  "ui.ribbon.shoot.blocked": () => "Nyní nelze střílet",
  "ui.ribbon.shoot.noAp": () => "Nedostatek AP pro střelbu",
  "ui.ribbon.shoot.pistolSpent": () =>
    "Kolečková bambitka maršála byla vystřelena (použijte pažbu [B])",
  "ui.ribbon.shoot.empty": (p) =>
    `Hlaveň je prázdná — nejprve nabijte [R] (${p.progress ?? 0}/${p.required ?? 0} AP)`,
  "ui.ribbon.shoot.noLos": () =>
    "Žádný nepřítel není v přímé viditelnosti z této dlaždice",
  "ui.ribbon.shoot.aria": () => "Střelba [2]",
  "ui.ribbon.reload.title": () => "Fázové nabíjení hlavně",
  "ui.ribbon.reload.cost": () => "1 AP / krok",
  "ui.ribbon.reload.pistol": () =>
    "Kolečkovou bambitku maršála Colloreda nelze uprostřed šarvátky znovu natáhnout.",
  "ui.ribbon.reload.progress": (p) =>
    `Postup nabíjení: ${p.progress ?? 0}/${p.required ?? 0} AP. Každý stisk investuje 1 AP a postup se přenáší do dalších kol.`,
  "ui.ribbon.reload.ready": (p) =>
    `Zbraň je plně nabitá (${p.required ?? 0}/${p.required ?? 0} AP) a připravená k výstřelu.`,
  "ui.ribbon.reload.blocked": () => "Nyní nelze nabíjet",
  "ui.ribbon.reload.pistolNo": () => "Jednoranná bambitka nelze v boji přebít",
  "ui.ribbon.reload.full": () => "Zbraň je již plně nabitá",
  "ui.ribbon.reload.noAp": () => "Nedostatek AP (vyžaduje 1 AP na krok)",
  "ui.ribbon.reload.aria": () => "Nabít zbraň [R]",
  "ui.ribbon.meleeTitle": (p, ctx) => `Boj zblízka: ${ctx.melee(p.meleeId) || "Pažba"}`,
  "ui.ribbon.melee.cost": () => "1 AP (0 AP při zteči)",
  "ui.ribbon.melee.summary": (p) =>
    `Zranění ${p.damage ?? 2}–${p.required ?? 4} HP. Pravým kliknutím (PKM) přímo na nepřítele v dosahu provedete okamžitý přesun spojený se seknutím bez další AP ceny!`,
  "ui.ribbon.melee.detail": () =>
    "Tip: Klikněte pravým tlačítkem přímo na nepřítele v dosahu pohybu pro okamžitou zteč!",
  "ui.ribbon.melee.blocked": () => "Nyní nelze útočit",
  "ui.ribbon.melee.noAp": () => "Nedostatek AP pro úder",
  "ui.ribbon.melee.none": () =>
    "Žádný nepřítel nestojí na sousední dlaždici (použijte PKM zteč z dálky)",
  "ui.ribbon.melee.aria": () => "Útok zblízka [B]",
  "ui.ribbon.overwatch.cone": () => "Připravená salva (90° kužel)",
  "ui.ribbon.overwatch.ring": () => "Střelecká hlídka (360°)",
  "ui.ribbon.overwatch.coneBody": (p) =>
    `Doutnáková mušketa zaměří 90° palebný sektor před střelcem (${p.facing ?? ""}) a automaticky vypálí na prvního Švéda v pohybu.`,
  "ui.ribbon.overwatch.ringBody": () =>
    "Kolečkový zámek umožňuje okamžitou reaktivní palbu v okruhu 360° na pohybujícího se nepřítele.",
  "ui.ribbon.overwatch.blocked": () => "Nyní nelze aktivovat střeleckou hlídku",
  "ui.ribbon.overwatch.active": () => "Střelecká hlídka je již aktivní",
  "ui.ribbon.overwatch.empty": () => "Nelze držet střeleckou hlídku s vybitou hlavní (nejprve nabijte [R])",
  "ui.ribbon.overwatch.need": (p) => `Vyžaduje ${p.required ?? 0} AP`,
  "ui.ribbon.overwatch.aria": () => "Střelecká hlídka [3]",
  "ui.ribbon.grenade.title": () => "Litinová petarda s černým prachem",
  "ui.ribbon.grenade.cost": () => "1 AP",
  "ui.ribbon.grenade.summary": () =>
    "Plošný výbuch 3×3 (dosah 8 polí): způsobí 4 HP poškození, strhne 2 body zbroje, zničí nízké kryty a odpálí prachové sudy.",
  "ui.ribbon.grenade.detail": (p) =>
    `LKM: Potvrdit hod do zóny · PKM: Zrušit míření (Zbývá: ${p.count ?? 0})`,
  "ui.ribbon.grenade.blocked": () => "Nyní nelze házet petardu",
  "ui.ribbon.grenade.none": () => "Voják již nemá žádné další petardy",
  "ui.ribbon.grenade.noAp": () => "Nedostatek AP pro hod petardy",
  "ui.ribbon.grenade.aria": () => "Petarda [4]",
  "ui.ribbon.ability.renew": (p) => `Obnovení za ${p.count ?? 0} kola`,
  "ui.ribbon.ability.ready": (p) => `Obnova: ${p.count ?? 0} kola`,
  "ui.ribbon.ability.blocked": () => "Nyní nelze použít schopnost",
  "ui.ribbon.ability.cooling": (p) => `Schopnost je v obnově (${p.count ?? 0} kola)`,
  "ui.ribbon.ability.need": (p) => `Vyžaduje ${p.required ?? 0} AP`,
  "ui.ribbon.ability.aria": (p) => `${p.names ?? ""} [5]`,
  "ui.ribbon.end.title": () => "Ukončit tah obránců",
  "ui.ribbon.end.cost": () => "Konec kola",
  "ui.ribbon.end.spent": () =>
    "Všichni obránci již vyčerpali své akční body. Předá iniciativu švédské hlídce.",
  "ui.ribbon.end.open": () =>
    "Předá tah švédské hlídce generála Königsmarcka i se zbývajícími AP.",
  "ui.ribbon.end.aria": () => "Ukončit tah [Mezerník]",
  "ui.ribbon.end.label": () => "Konec",

  "ui.title.aria": () => "Praha 1648: Víra v časech olova",
  "ui.title.place": () => "Praha",
  "ui.title.year": () => "1648",
  "ui.title.subtitle": () => "Víra v časech olova",
  "ui.title.anno": () => "Anno Salutis",
  "ui.title.company": () => "Železná vigilie",
  "ui.title.motto": () => "Fidelitas Ferrea",
  "ui.title.date": () => "Červenec 1648",
  "ui.briefing.title": () => "Vyberte kapitolu výpravy",
  "ui.briefing.start": () => "Zahájit",
  "ui.briefing.mission1.index": () => "Mise I",
  "ui.briefing.mission1.when": () => "Noc",
  "ui.briefing.mission1.place": () => "Velkopřevorský palác",
  "ui.briefing.mission1.title": () => "Útěk",
  "ui.briefing.mission1.body": () =>
    "Maršál Colloredo v noční košili, zahrada a pramice na Čertovce.",
  "ui.briefing.mission2.index": () => "Mise II",
  "ui.briefing.mission2.when": () => "Ráno",
  "ui.briefing.mission2.place": () => "Staroměstská mostecká věž",
  "ui.briefing.mission2.chip": () => "Železná mříž",
  "ui.briefing.mission2.title": () => "Mříž",
  "ui.briefing.mission2.body": () =>
    "Páter Plachý, řezník a zloděj lan. Harcovníci na prahu, jeden okultista u svorníku.",
  "ui.briefing.mission3.index": () => "Mise III",
  "ui.briefing.mission3.when": () => "Noc",
  "ui.briefing.mission3.place": () => "Prachový dvůr u mosteckých věží",
  "ui.briefing.mission3.chip": () => "Tři káry",
  "ui.briefing.mission3.title": () => "Doutnák",
  "ui.briefing.mission3.body": () =>
    "Páter a dva muži. Doutnák do skladu dřív, než třetí kára projede branou.",
  "ui.splash.m2.player": () => "Spusťte mříž",
  "ui.splash.m2.enemy": () => "Harcovníci na prahu",
  "ui.splash.m2.player.body": () =>
    "Rumpál je v síni nad klenbou. Nápis pod střechou přidá obřadu kolo.",
  "ui.splash.m2.enemy.body": () =>
    "Démoničtí harcovníci stojí na prahu. Okultista jde několik kol za nimi.",
  "ui.floor.m2.2.title": () => "Ochoz pod střechou",
  "ui.floor.m2.2.sub": () => "Nápis a světci východního průčelí",
  "ui.floor.m2.1.title": () => "Síň s rumpálem",
  "ui.floor.m2.1.sub": () => "Odtud se spouští železná mříž",
  "ui.floor.m2.0.title": () => "Průjezd a práh",
  "ui.floor.m2.0.sub": () => "Most na západ, náměstí na východ",
  "ui.mission.rite": (p) => `Obřad ${p.progress ?? 0}/${p.required ?? 3}`,
  "ui.mission.windlass": (p) => `Rumpál ${p.progress ?? 0}/${p.required ?? 1}`,
  "ui.mission.windlassHp": (p) => `Rumpál ${p.hp ?? 0} HP`,
  "ui.epilogue.m2.title": () => "Mříž dosedla",
  "ui.epilogue.m2.body": () =>
    "Železo sedí v ústí průjezdu a stráž věže ještě drží. V Klementinu nabídne Plachý přísahu krve a železa těm, kdo přežili. Sám neskládá noviciát.",
  "ui.epilogue.m2.defeat": () => "Staroměstská věž padla",
  "ui.epilogue.m2.defeat.rite": () => "Obřad byl rychlejší než železo.",
  "ui.epilogue.m2.defeat.plachy": () => "Páter padl. Věž se bez něj neudrží.",
  "ui.epilogue.m2.defeat.wiped": () => "Obrana věže padla do posledního muže.",
  "ui.epilogue.m2.defeat.windlass": () => "Rumpál je zničený a mříž zůstala nahoře.",
  "ui.epilogue.other": () => "Jiná mise",
  "ui.sacrifice.clause": () =>
    "Jeden z vašich věrných společníků musí zůstat u palácové branky a odpálit sudy s prachem",
  "ui.sacrifice.vigilQuote": () =>
    "„Tvá oběť z tebe smyla strach. Od této chvíle jsi mečem Železné vigilie.“",
  "ui.ribbon.kneel": () => "Pokleknout, 1 AP",
  "ui.ribbon.kneel.aria": () => "Pokleknout u nápisu za 1 AP",
  "ui.ribbon.unpin": () => "Vyrazit západku, 1 AP",
  "ui.ribbon.unpin.aria": () => "Vyrazit západku rumpálu za 1 AP",
  "ui.ribbon.severRope": () => "Přeříznout lano, 1 AP",
  "ui.ribbon.severRope.aria": () => "Přeříznout kotevní lano mříže za 1 AP",
  "ui.ribbon.douse": () => "Uhasit oheň, 1 AP",
  "ui.ribbon.douse.aria": () => "Uhasit hořící rumpál za 1 AP",
  "ui.mission.windlassBurning": () => "Rumpál hoří! (−3 HP)",
  "ui.mission.ropeTaut": () => "Lano napnuto",
  "ui.oath.both": () => "Přijmout oba",
  "ui.oath.havel": () => "Jen Havla",
  "ui.oath.ondrej": () => "Jen Ondřeje",
  "ui.oath.neither": () => "Nepřijmout nikoho",
  "ui.oath.done": () => "Přísaha je zapsaná.",
  "ui.ribbon.m3.lay": () => "Položit doutnák, 1 AP",
  "ui.ribbon.m3.lay.aria": () => "Položit doutnák za 1 AP",
  "ui.ribbon.m3.lay.two": () => "Položit dva články, 1 AP",
  "ui.ribbon.m3.lay.two.aria": () => "Položit dva články doutnáku za 1 AP",
  "ui.ribbon.m3.lay.reject": () => "Sem se doutnák neklade",
  "ui.ribbon.m3.light": () => "Zapálit stopu, 1 AP",
  "ui.ribbon.m3.light.aria": () => "Zapálit doutnákovou stopu za 1 AP",
  "ui.ribbon.m3.relight": () => "Znovu zapálit, 1 AP",
  "ui.ribbon.m3.relight.aria": () => "Znovu zapálit doutnák za 1 AP",
  "ui.ribbon.m3.tackle": () => "Přeříznout postraňky, 1 AP",
  "ui.ribbon.m3.tackle.aria": () => "Přeříznout postraňky káry za 1 AP",
  "ui.ribbon.m3.rope": () => "Po laně na lodžii, 1 AP",
  "ui.ribbon.m3.rope.aria": () => "Vylézt po laně na lodžii za 1 AP",
  "ui.ribbon.m3.stair": () => "Vystoupat po schodech, 1 AP",
  "ui.ribbon.m3.stair.aria": () => "Vystoupat po schodech na lodžii za 1 AP",
  "ui.ribbon.m3.down": () => "Sestoupit, 1 AP",
  "ui.ribbon.m3.down.aria": () => "Sestoupit z lodžie za 1 AP",
  "ui.mission.m3.carts": (p) => `Káry ${p.count ?? 0}/3`,
  "ui.mission.m3.silent": () => "Ticho",
  "ui.mission.m3.spark": () => "Jiskra",
  "ui.mission.m3.stamped": () => "Zašlápnuto",
  "ui.mission.m3.burning": () => "Sklad hoří",
  "ui.splash.m3.player": () => "Tah výsadku",
  "ui.splash.m3.enemy": () => "Tah švédské hlídky",
  "ui.splash.m3.player.body": () =>
    "Doutnák do skladu dřív, než třetí kára projede branou.",
  "ui.splash.m3.enemy.body": () => "Káry jedou k bráně baterie.",
  "ui.epilogue.m3.title": () => "Doutnák dohořel",
  "ui.epilogue.m3.defeat": () => "Noc se nepodařila",
  "ui.epilogue.m3.mute": () =>
    "Prachový dvůr vzplanul a brána baterie nedostala ani jednu káru. Za úsvitu baterie mlčela. Věž držela.",
  "ui.epilogue.m3.scar": () =>
    "Prachový dvůr vzplanul. Baterie za úsvitu promluvila jednou a věž držela.",
  "ui.epilogue.m3.defeat.delivery": () =>
    "Třetí kára projela branou baterie dřív, než jiskra vešla do dveří skladu.",
  "ui.epilogue.m3.defeat.plachy": () =>
    "Jiří Plachý padl. Bez něj se zpráva o doutnáku nevrátí.",
  "ui.epilogue.m3.defeat.wiped": () => "Celý výsadek padl.",
  "ui.epilogue.m2.defeatMeta": (p) =>
    `Katastrofa v ${p.count}. kole · Anno Salutis 1648, 26. července`,
  "ui.epilogue.m3.defeatMeta": (p) =>
    `Nezdar v ${p.count}. kole · Anno Salutis 1648, noc z 27. na 28. července`,
  "ui.epilogue.m3.victoryMeta": (p) =>
    `Mise splněna v ${p.count}. kole · Anno Salutis 1648, noc z 27. na 28. července`,
  "ui.floor.m3.1.title": () => "Krytá lodžie",
  "ui.floor.m3.1.sub": () => "Ochoz nad dvorem, schody a lano",
  "ui.floor.m3.0.title": () => "Prachový dvůr a sklad",
  "ui.floor.m3.0.sub": () => "Čertovka, doutnáková stopa a brána baterie",

  "tutorial.step_1_matej_move.speaker": () => "Jan Matěj",
  "tutorial.step_1_matej_move.role": () => "Osobní komorník velkopřevora",
  "tutorial.step_1_matej_move.title": () => "KROK 1/8 · ZÁKLADNÍ POHYB A KRYT",
  "tutorial.step_1_matej_move.order": () =>
    "Pohněte Janem Matějem za mramorovou balustrádu [Pravé tlačítko myši na označené pole]",
  "tutorial.step_1_matej_move.tip": () =>
    "Modrá zóna (1 AP) vám zachová akci pro střelbu či kryt. Balustráda (−20 % šance na zásah) zachraňuje životy!",
  "tutorial.step_1_matej_move.beacon": () => "Kryt za balustrádou [PKM Pohyb]",
  "tutorial.step_2_colloredo_escort.speaker": () => "Jan Matěj",
  "tutorial.step_2_colloredo_escort.role": () => "Osobní komorník velkopřevora",
  "tutorial.step_2_colloredo_escort.title": () => "KROK 2/8 · TĚŽKÉ KULHÁNÍ & PRAVIDLO ZAJETÍ",
  "tutorial.step_2_colloredo_escort.order": () =>
    "Přesuňte maršála Colloreda do chráněné pozice za Janem Matějem [Pravé tlačítko myši]",
  "tutorial.step_2_colloredo_escort.tip": () =>
    "Maršál ujde kvůli 7 ranám z Lützenu jen 3 pole/AP. Švédové po něm nestřílí (chtějí výkupné 100 000 tolarů), ale zajmou jej při kontaktu na 1 AP!",
  "tutorial.step_2_colloredo_escort.beacon": () => "Chráněná pozice maršála [PKM Pohyb]",
  "tutorial.step_3_vaclav_aim.speaker": () => "Václav z Michalovic",
  "tutorial.step_3_vaclav_aim.role": () => "Klementinský student & písař",
  "tutorial.step_3_vaclav_aim.title": () => "KROK 3/8 · KŘÍDLENÍ A MÍŘENÍ",
  "tutorial.step_3_vaclav_aim.order": () =>
    "Přepněte na střelbu [Klávesa 2 nebo klik na terč] a zaměřte švédského zvěda na terase",
  "tutorial.step_3_vaclav_aim.tip": () =>
    "Václav z arkády Piano Nobile obchází nepřátelský kryt — žlutý štít značí Křídlení a +40 % k šanci na kritický zásah!",
  "tutorial.step_3_vaclav_aim.beacon": () => "Nekrytý švédský střelec (Křídlení +40 % krit)",
  "tutorial.step_4_vaclav_shoot.speaker": () => "Václav z Michalovic",
  "tutorial.step_4_vaclav_shoot.role": () => "Klementinský student & písař",
  "tutorial.step_4_vaclav_shoot.title": () => "KROK 4/8 · MÍŘENÍ, ROZPAD ŠANCE A VÝSTŘEL",
  "tutorial.step_4_vaclav_shoot.order": () =>
    "Vystřelte na zaměřeného nepřítele [Klávesa Mezerník / Enter]",
  "tutorial.step_4_vaclav_shoot.tip": () =>
    "Křídla rozpadu šance v liště ukazují transparentní výpočet: základní přesnost ± vzdálenost − kryt. Výstřel spustí filmovou kameru přes rameno.",
  "tutorial.step_4_vaclav_shoot.beacon": () => "Cíl střelby [Potvrdit výstřel Mezerníkem]",
  "tutorial.step_5_enemy_turn_react.speaker": () => "Arnošt Odowalsky",
  "tutorial.step_5_enemy_turn_react.role": () => "Velitel švédských mušketýrů",
  "tutorial.step_5_enemy_turn_react.title": () => "KROK 5/8 · ŠVÉDSKÁ ODVETA & ZÁCHRANA KRYTEM",
  "tutorial.step_5_enemy_turn_react.order": () =>
    "Sledujte odvetnou palbu Švédů z krytu za balustrádou",
  "tutorial.step_5_enemy_turn_react.tip": () =>
    "Švédský výstřel zasáhl balustrádu a odrazil se! Kamenný kryt zachránil Václavovi život. Na otevřeném poli by byl mrtvý.",
  "tutorial.step_6_vaclav_reload.speaker": () => "Bratr Bartoloměj",
  "tutorial.step_6_vaclav_reload.role": () => "Maltézský zbrojmistr",
  "tutorial.step_6_vaclav_reload.title": () => "KROK 6/8 · FÁZOVÉ NABÍJENÍ PO 1 AP",
  "tutorial.step_6_vaclav_reload.order": () =>
    "Zbraň je prázdná! Investujte 1 AP do nasypání prachu a nabití [Klávesa R]",
  "tutorial.step_6_vaclav_reload.tip": () =>
    "Palné zbraně 17. století se nabíjejí po krocích (M1624 na 2 AP, těžká mušketa na 4 AP). Můžete nabít 1 AP a za zbývající 1 AP ustoupit do bezpečí!",
  "tutorial.step_7_keg_explosion.speaker": () => "Bratr Bartoloměj",
  "tutorial.step_7_keg_explosion.role": () => "Maltézský zbrojmistr",
  "tutorial.step_7_keg_explosion.title": () => "KROK 7/8 · PRACHOVÝ SUD & ZNIČENÍ KRYTU",
  "tutorial.step_7_keg_explosion.order": () =>
    "Zvolte petardu [4] nebo střelu a zaměřte prachový sud vedle barikády",
  "tutorial.step_7_keg_explosion.tip": () =>
    "Nepřátelé za těžkým krytem mají vysokou obranu. Výbuch sudu na ploše 3×3 zničí zídky, zapálí terén a vytvoří hustý černoprachý dým!",
  "tutorial.step_7_keg_explosion.beacon": () => "Prachový sud (Odpálit výbuchem 3×3!)",
  "tutorial.step_8_melee_finish.speaker": () => "Jan Matěj",
  "tutorial.step_8_melee_finish.role": () => "Osobní komorník velkopřevora",
  "tutorial.step_8_melee_finish.title": () => "KROK 8/8 · ZTEČ ZBLÍZKA",
  "tutorial.step_8_melee_finish.order": () =>
    "Klikněte pravým tlačítkem (PKM) přímo na zraněného nepřítele pro zteč chladnou zbraní",
  "tutorial.step_8_melee_finish.tip": () =>
    "Zteč kordem či tesákem nevyžaduje žádný drahocenný střelný prach a útok je zdarma součástí pohybu k nepříteli!",
  "tutorial.step_8_melee_finish.beacon": (p, ctx) =>
    `Zteč chladnou zbraní na ${acc(ctx, p.unitId)} [PKM]`,
  "tutorial.step_9_free_combat.speaker": () => "Bratr Bartoloměj",
  "tutorial.step_9_free_combat.role": () => "Maltézský zbrojmistr",
  "tutorial.step_9_free_combat.title": () => "VOLNÁ TAKTIKA · ÚNIK K ČERTOVCE",
  "tutorial.step_9_free_combat.order": () =>
    "ÚKOL MISE: Doveďte maršála Colloreda k rybářské pramici na Čertovce! [Přepínání pater V]",
  "tutorial.step_9_free_combat.tip": () =>
    "Základní výcvik je u konce, Vaše Excelence! Využijte schodiště a patra [V / PageDown], kryjte ústup maršála a probijte se k lodi.",
  "tutorial.step_9_free_combat.beacon": () => "Rybářská pramice (Cíl mise)",
  "tutorial.reject.step_1_matej_move.unit": () =>
    "Jan Matěj: „Vaše Excelence, teď musím zajistit cestu já! Pohněte se mnou za balustrádu.“",
  "tutorial.reject.step_1_matej_move.tile": () =>
    "Jan Matěj: „Tam ne, Vaše Excelence! Na volném prostranství bych byl snadným terčem. Kryjme se za balustrádou!“",
  "tutorial.reject.step_1_matej_move.action": () =>
    "Jan Matěj: „Nejprve se musíme přesunout do krytu!“",
  "tutorial.reject.step_2_colloredo_escort.unit": () =>
    "Jan Matěj: „Pomohu vám, milostivý pane! Nyní musíme vyvést maršála.“",
  "tutorial.reject.step_2_colloredo_escort.tile": () =>
    "Jan Matěj: „Držte se těsně v mém závěsu za zdí, pane! Švédové nesmí maršála obklíčit.“",
  "tutorial.reject.step_2_colloredo_escort.action": () =>
    "Jan Matěj: „Musíme maršála dostat do bezpečí!“",
  "tutorial.reject.step_3_vaclav_aim.unit": () =>
    "Václav z Michalovic: „Mám výbornou pozici na arkádě, nechte mě zamířit!“",
  "tutorial.reject.step_3_vaclav_aim.action": () =>
    "Václav z Michalovic: „Stiskněte [2] pro míření a [Mezerník] pro výstřel!“",
  "tutorial.reject.step_6_vaclav_reload.action": () =>
    "Bratr Bartoloměj: „Prázdná hlaveň nestřílí! Stiskněte [R] a nabijte prach.“",
  "tutorial.reject.step_7_keg_explosion.action": () =>
    "Bratr Bartoloměj: „Ten Švéd je v plném krytu! Odpalte petardou [4] prachový sud!“",
  "tutorial.reject.default": () => "Rádce: „Soustřeďte se na rozkaz velení.“",
  "tutorial.keg": () => "Prachový sud (Odpálit!)",
  "tutorial.dock": () => "Rybářská pramice (Cíl)",

  "ui.document.title": () => "Praha 1648",
  "ui.document.description": () =>
    "Praha 1648: Víra v časech olova. Tahová taktická hra z obléhání Prahy roku 1648.",
  "ui.locale.switch": (p) => `Jazyk: ${p.names ?? ""}`,
  "ui.weather.rain": () => "Noční liják: -10 % k zásahu, doutnáky v dešti selhávají",
  "ui.weather.fog": () => "Ranní vltavská mlha: -10 % k zásahu",
  "ui.weather.clear": () => "Jasná noc: optimální podmínky pro střelbu",
  "ui.epilogue.boatTitle": () => "Útěk na Vltavě dokonán & Zrod Železné vigilie",
  "ui.epilogue.wipeTitle": () => "Přepadový oddíl zničen!",
  "ui.epilogue.defeatTitle": () => "Vrchní velitel padl do zajetí",
  "ui.epilogue.victoryMeta": (p) =>
    `Mise splněna v ${p.count}. kole · Anno Salutis 1648, 26. července`,
  "ui.epilogue.defeatMeta": (p) =>
    `Katastrofa v ${p.count}. kole · Maršál Colloredo zadržen po 2 kola`,
  "ui.epilogue.boat.1.title": () => "1. Smrt v loďce a záchrana maršála:",
  "ui.epilogue.boat.1.body": () =>
    "Když pramice odrazila do temného proudu Vltavy, švédští mušketýři spustili ze břehu prudkou palbu. Dva věrní společníci v loďce vlastním tělem zakryli maršála Colloreda v noční košili. Na staroměstském břehu u křižovnického kláštera předali zraněného velitele strážím a v kalužích krve a nočního deště vydechli naposledy. Stráž na Staroměstské mostecké věži spustila železnou mříž doslova před nosem švédských dragounů!",
  "ui.epilogue.boat.2.title": () => "2. Zázrak u palácové branky (Paradoxní oběť):",
  "ui.epilogue.boat.2.body": (p, ctx) =>
    `Mezitím u palácové branky ${nom(ctx, p.heroId) || "obětovaný hrdina"} odpálil sudy s prachem. Ohlušující detonace smetla švédský předvoj a tlaková vlna jej odmrštila do rozvodněné Čertovky. Zraněný, popálený, ale živý se v temnotě proplížil podél Kampy a přeplaval řeku na Staré Město!`,
  "ui.epilogue.boat.3.title": () => "3. Přijetí do ŽELEZNÉ VIGILIE Klementinských jezuitů:",
  "ui.epilogue.boat.3.body": () =>
    "Polomrtvého hrdinu na schodech Klementina zvedl sám Pater Jiří Plachý. Když spatřil jeho odvahu, vtiskl mu do rukou posvěcenou zbraň a zahalil jej černým pláštěm: „Tvá oběť z tebe smyla strach. Od této chvíle jsi mečem Železné vigilie.“",
  "ui.epilogue.perk.member": (p, ctx) =>
    `Nový člen Železné vigilie: ${nom(ctx, p.heroId)}`,
  "ui.epilogue.perk.name": (p) => `Trvalý perk: ${p.names ?? ""}`,
  "ui.sacrifice.title": () => "Dilema oběti: Kdo zadrží Švédy u palácové branky?",
  "ui.sacrifice.when": () => "Anno Salutis 1648, 26. července, 02:45 · Rameno Čertovky u Velkopřevorství",
  "ui.sacrifice.body": () =>
    "Švédští dragouni generála Königsmarcka vpadli do zahrady a střílejí ze všech stran! Rozvodněná Vltava a malá rybářská pramice neunesou všechny. Jeden z vašich věrných společníků musí zůstat u palácové branky a odpálit sudy s prachem, aby maršál Colloredo mohl bezpečně odrazit do proudu řeky. Koho pověříte tímto osudovým úkolem?",
  "ui.sacrifice.matej.role": () => "Osobní komorník",
  "ui.sacrifice.matej.line": () => "„Můj život už patří minulosti, milostivý pane. Odražte s maršálem!“",
  "ui.sacrifice.matej.perk": () => "+20 % odolnost proti šoku, +1 AP při záchraně raněného",
  "ui.sacrifice.bart.role": () => "Maltézský zbrojmistr",
  "ui.sacrifice.bart.line": () => "„Zasypu branku olovem a odpálím zbrojnici i se Švédy!“",
  "ui.sacrifice.bart.perk": () => "+2 dosah petard, výbuchy prachu o +1 silnější",
  "ui.sacrifice.vaclav.role": () => "Klementinský klerik & písař",
  "ui.sacrifice.vaclav.line": () => "„Bůh mě ochraňuj, zdržím je s křížem a karabinou!“",
  "ui.sacrifice.vaclav.perk": () => "+10 % k zásahu z výšky, spolehlivost v dešti",
  "ui.sacrifice.perkLabel": (p) => `Perk: ${p.names ?? ""}`,
  "ui.floor.2.title": () => "Maltézská věž",
  "ui.floor.2.sub": () => "Střešní ochoz (+15 % zásah, +5.5 dohled)",
  "ui.floor.1.title": () => "Piano Nobile & Belveder",
  "ui.floor.1.sub": () => "1. patro paláce a terasa (+2.2 dohled)",
  "ui.floor.0.title": () => "Přízemí & Zahrada",
  "ui.floor.0.sub": () => "Nádvoří, Sala Terrena, Čertovka",
  "ui.tools.aria": () => "Taktické nástroje a kamera",
  "ui.camera.left": () => "Otočit kameru o 90° vlevo [Q]",
  "ui.camera.right": () => "Otočit kameru o 90° vpravo [E]",
  "ui.floors.aria": () => "Výběr podlaží",
  "ui.floors.switch": (p) => `Přepnout patro P${p.floor ?? 0} [V / PgUp / PgDn]`,
  "ui.floors.stack": () => "Zobrazit architektonický průřez pater a pozice jednotek",
  "ui.floors.word": () => "Patra",
  "ui.fog.title": () => "Barokní šerosvit / Mlha války [G]",
  "ui.chronicle.aria": () => "Kronika boje",
  "ui.chronicle.drag": () => "Tažením lze kroniku posunout · Kliknutím rozbalíte historii boje",
  "ui.chronicle.reset": () => "Vrátit kroniku na výchozí místo",
  "ui.chronicle.expand": () => "Rozbalit historii boje",
  "ui.chronicle.collapse": () => "Sbalit historii boje",
  "ui.chronicle.empty": (p) => `Diarium (${p.count ?? 0})`,
  "ui.door.double": (p, ctx) =>
    `${ctx.door(p.doorId)}: Kliknutím ${p.open ? "zavřete" : "otevřete"} dvoukřídlý portál (Volná akce 0 AP)`,
  "ui.door.single": (p, ctx) =>
    `${ctx.door(p.doorId)}: Kliknutím ${p.open ? "zavřete" : "otevřete"} dveře (Volná akce 0 AP)`,
  "ui.melee.now": (p, ctx) =>
    `Pravým kliknutím okamžitý útok zblízka (${ctx.melee(p.meleeId)}, 1 AP)`,
  "ui.melee.charge": (p, ctx) =>
    `Zteč zblízka: Pravým kliknutím okamžitý přesun (${p.count ?? 0} AP) spojený se seknutím (${ctx.melee(p.meleeId)}, +0 AP navíc)!`,
  "ui.smoke.title": () => "Kouř z černého prachu (−10 % střelec / −15 % cíl / −20 % z výšky)",
} satisfies Record<string, MessageFn>;

export type UiMessageId = keyof typeof csUiMessages;
