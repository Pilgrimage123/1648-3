import type { FormatContext, MessageFn, MessageParams } from "./types";

const nom = (ctx: FormatContext, id?: string) => ctx.unit(id, "nom");
const acc = (ctx: FormatContext, id?: string) => ctx.unit(id, "acc");
const gen = (ctx: FormatContext, id?: string) => ctx.unit(id, "gen");

function shotTags(p: MessageParams): string {
  const parts: string[] = [];
  if (p.hipFire) parts.push("NOUZOVÁ STŘELBA OD BOKU 1 AP (−35 % Aim, Otřesen)");
  else if (p.fork) parts.push("opora furkety (2 AP)");
  if (p.height) parts.push("výšková převaha +15 %");
  if (p.flanked) parts.push("OBCHVAT +40 % krit");
  if ((p.shred ?? 0) > 0) parts.push(`zničena zbroj −${p.shred}`);
  if ((p.absorbed ?? 0) > 0) parts.push(`kyrys pohltil ${p.absorbed} HP`);
  return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

function statusTag(p: MessageParams): string {
  if (p.instant) return " (OKAMŽITĚ PADL!)";
  if (p.enteredThroes) return " (POSLEDNÍ VZEPĚTÍ!)";
  if (p.agony) return ` (POSLEDNÍ VZEPĚTÍ: ${p.hp ?? 0} HP)`;
  return "";
}

function meleeTags(p: MessageParams): string {
  const parts: string[] = [];
  if (p.stunned) parts.push("OMRÁČEN PAŽBOU (Otřesen)");
  if (p.spilled) parts.push("vysypáno rozpracované nabíjení (0/4 AP)");
  if (p.height) parts.push("výšková převaha +15 %");
  if ((p.shred ?? 0) > 0) parts.push(`zničena zbroj −${p.shred}`);
  if ((p.absorbed ?? 0) > 0) parts.push(`kyrys pohltil ${p.absorbed} HP`);
  return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

function reloadVerb(p: MessageParams): string {
  const progress = p.progress ?? 0;
  if (p.heavy) {
    if (progress === 1) return "odměřil dávku černého prachu z apoštola a nasypal ji do hlavně";
    if (progress === 2) return "zasunul těžkou olověnou kuli s ucpávkou a zarazil ji nabijákem";
    if (progress === 3) return "nasypal jemný prach na pánvičku a přiklopil kryt proti větru";
    return "rozdmychal doutnající šňůru v kohoutu a opřel hlaveň o furketu — TĚŽKÁ MUŠKETA JE PLNĚ NABITA!";
  }
  if (progress === 1 && !p.loaded) {
    return "ukousl papírovou patronu, nasypal prach na pánvičku i do hlavně a vložil kuli";
  }
  return "utěsnil náboj nabijákem a připravil zámek — ZBRAŇ JE PLNĚ NABITA!";
}

function climbNote(p: MessageParams): string {
  if (p.climb === "up") return ` (vystoupal po schodišti do ${p.floor}. patra)`;
  if (p.climb === "ground") return " (sestoupil po schodišti do přízemí)";
  if (p.climb === "down") return ` (sestoupil po schodišti do ${p.floor}. patra)`;
  return "";
}

export const csMessages = {
  "log.briefing.gate": () =>
    "26. července 1648, 02:30 ráno (Noční liják): Zrádce Arnošt Odowalsky otevřel Strahovskou bránu švédským dragounům generála Königsmarcka!",
  "log.briefing.escape": () =>
    "Maršál Rudolf Colloredo vyskočil z lůžka v noční košili. Malostranská mostecká věž je odříznuta! Dostaňte zraněného maršála zahradou k rybářské pramici na Čertovce!",
  "log.podReveal": (p, ctx) => {
    const names =
      p.unitIds?.map((id) => ctx.unit(id, "nom")).filter(Boolean).join(", ") ||
      p.names ||
      "";
    return `ODHALENÍ HLÍDKY: Z šerosvitu vystoupila švédská hlídka (${names}) a kvapně hledá kryt!`;
  },
  "log.capture.done": (p) => {
    if (p.capture === "zero_hp") {
      return "SMRTELNÁ ZRANĚNÍ: Těžce raněný polní maršál Colloredo podlehl svým zraněním a Praha ztratila vrchního velitele!";
    }
    if (p.capture === "all_companions_fallen") {
      return "ZAJETÍ: Všichni obránci z maršálovy družiny padli a bezmocný maršál Colloredo padl do rukou Švédů!";
    }
    return "ZAJETÍ DOKONÁNO: Švédští vojáci obklíčili nechráněného maršála Colloreda a odvlekli jej v poutech pro výkupné 100 000 tolarů!";
  },
  "log.detained.overwatch": () =>
    "POZOR (ZADRŽEN 1/2 KOLA): Maršál Colloredo se po palbě ze zálohy ocitl bez eskorty v blízkosti Švéda! Máte 1 kolo na to, abyste k němu přivedli spojence a vyprostili jej!",
  "log.overwatch.shot": (p, ctx) => {
    if (p.misfired) {
      return `${nom(ctx, p.attackerId)} chtěl vypálit ze zálohy na ${acc(ctx, p.targetId)}, ale zvlhlý prach selhal!`;
    }
    if (p.hit) {
      const shred = (p.shred ?? 0) > 0 ? `, −${p.shred} zbroj` : "";
      const crit = p.critical ? ", KRITICKÝ!" : "";
      return `${nom(ctx, p.attackerId)} zasáhl z přepadu nekrytého ${acc(ctx, p.targetId)} (−${p.damage ?? 0} HP${shred}${crit})!`;
    }
    return `${nom(ctx, p.attackerId)} vypálil ze zálohy na běžícího ${acc(ctx, p.targetId)}, ale minul (${p.chance ?? 0} %).`;
  },
  "log.sacrifice.volunteer": (p, ctx) =>
    `${nom(ctx, p.heroId)} se dobrovolně obětoval u branky paláce, aby maršál Colloredo mohl odrazit s pramicí do vln Vltavy!`,
  "log.sacrifice.paradox": (p, ctx) =>
    `PARADOX PŘEŽITÍ: Dva společníci v loďce padli pod salvou švédských mušket, kryjíce maršála. Ale ${nom(ctx, p.heroId)} zázrakem přežil výbuch prachu, přeplaval řeku a Pater Jiří Plachý jej v Klementinu přijal do ŽELEZNÉ VIGILIE!`,
  "log.keg.shot": (p, ctx) =>
    `${nom(ctx, p.attackerId)} přesnou ranou odpálil sud se střelným prachem na [${p.x}, ${p.z}] (${p.count ?? 0} zasaženo za 5 HP, −2 zbroj a hustý dým)!`,
  "log.door.breach": (p, ctx) => `${nom(ctx, p.unitId)} za běhu vyrazil dřevěné dveře!`,
  "log.rescue.move": (p, ctx) =>
    `ZÁCHRANA VELITELE: ${nom(ctx, p.unitId)} přispěchal k maršálu Colloredovi, vyprostil jej ze švédského sevření a pomohl mu zpět na nohy!`,
  "log.detained.escort": () =>
    "POZOR (ZADRŽEN 1/2 KOLA): Maršál Colloredo se ocitl bez eskorty v těsné blízkosti švédského vojáka a je zadržen! Vyprostěte jej do 2 kol!",
  "log.move": (p, ctx) => {
    const zone = p.zone === "yellow" ? "Sprint (2 AP)" : "Přesun (1 AP)";
    return `${nom(ctx, p.unitId)}: ${zone} na [${p.x}, patro ${p.y}, ${p.z}]${climbNote(p)}.`;
  },
  "log.victory.boat": () =>
    "MARŠÁL COLLOREDO DOSÁHL RYBÁŘSKÉ PRAMICE! Rybář okamžitě odráží od břehu a veze maršála přes rozvodněnou Vltavu na Staré Město!",
  "log.victory.annihilation": () =>
    "Švédský přepadový oddíl Arnošta Odowalského byl zneškodněn! Cesta k rybářské pramici na Čertovce je volná!",
  "log.pistol.spent": () =>
    "Bambitka maršála Colloreda je již vystřelená! V boji ji nelze znovu nabít — zbývá pouze úder těžkou pažbou zblízka.",
  "log.weapon.empty": (p, ctx) =>
    `Zbraň postavy ${gen(ctx, p.unitId)} (${ctx.weapon(p.weaponId)}) je vybitá (${p.progress ?? 0}/${p.required ?? 0} AP)! Pokračujte ve Fázovém nabíjení [R] po 1 AP nebo udeřte pažbou zblízka [B].`,
  "log.fork.requiresTwoAp": (p, ctx) =>
    `Těžká mušketa (${ctx.weapon(p.weaponId)}) vyžaduje 2 AP bez pohybu v kole výstřelu pro rozložení furkety!`,
  "log.shot": (p, ctx) => {
    if (p.misfired) {
      return `${nom(ctx, p.attackerId)} stiskl spoušť (${ctx.weapon(p.weaponId)}), ale vlhký střelný prach na pánvičce jen zasyčel (Selhání ${p.misfire ?? 0} %)!`;
    }
    if (p.hit) {
      const crit = p.critical ? " — KRITICKÝ PRŮSTŘEL!" : "";
      return `${nom(ctx, p.attackerId)} zasáhl ${acc(ctx, p.targetId)} (${p.chance ?? 0} %) za ${p.damage ?? 0} HP${crit}${statusTag(p)}${shotTags(p)}.`;
    }
    return `${nom(ctx, p.attackerId)} minul ${acc(ctx, p.targetId)} (šance ${p.chance ?? 0} %)${shotTags(p)}.`;
  },
  "log.keg.spark": (p) =>
    `VÝBUCH PRACHU! Jiskra z výstřelu odpálila sud se střelným prachem na [${p.x}, ${p.z}]!`,
  "log.rescue.shot": () =>
    "ZÁCHRANA VELITELE: Švédský věznitel padl a maršál Colloredo je opět volný!",
  "log.detained.blast": () =>
    "VAROVÁNÍ (ZADRŽEN 1/2 KOLA): Maršál Colloredo zůstal po výbuchu bez eskorty v švédském sevření! Přiveďte k němu spojence a vyprostěte jej do 2 kol!",
  "log.pistol.cannotReload": () =>
    "Jednorannou bambitku maršála Colloreda nelze v boji znovu nabít! Zbývá pouze úder těžkou pažbou zblízka [B].",
  "log.weapon.alreadyLoaded": (p, ctx) =>
    `Zbraň postavy ${gen(ctx, p.unitId)} (${ctx.weapon(p.weaponId)}) je již plně nabitá a připravená k výstřelu!`,
  "log.reload.noAp": (p, ctx) =>
    `Nedostatek akčních bodů! Každý krok fázového nabíjení (${ctx.weapon(p.weaponId)}) vyžaduje 1 AP.`,
  "log.reload.step": (p, ctx) =>
    `FÁZOVÉ NABÍJENÍ (1 AP — ${p.progress ?? 0}/${p.required ?? 0}): ${nom(ctx, p.unitId)} ${reloadVerb(p)}`,
  "log.melee": (p, ctx) => {
    const weapon = ctx.melee(p.meleeId);
    const tags = meleeTags(p);
    if (p.butt) {
      return p.hit
        ? `${nom(ctx, p.attackerId)} udeřil ${acc(ctx, p.targetId)} pažbou (${weapon}, ${p.chance ?? 0} %) za ${p.damage ?? 0} HP${p.critical ? " — DRTIVÝ ÚDER!" : ""}${statusTag(p)}${tags}.`
        : `${nom(ctx, p.attackerId)} máchl pažbou (${weapon}) naprázdno vedle ${gen(ctx, p.targetId)} (${p.chance ?? 0} %)${tags}.`;
    }
    return p.hit
      ? `${nom(ctx, p.attackerId)} zasáhl ${acc(ctx, p.targetId)} chladnou zbraní (${weapon}, ${p.chance ?? 0} %) za ${p.damage ?? 0} HP${p.critical ? " — SMRTÍCÍ SEK!" : ""}${statusTag(p)}${tags}.`
      : `${nom(ctx, p.attackerId)} sekl zbraní ${weapon} vedle ${gen(ctx, p.targetId)} (${p.chance ?? 0} %)${tags}.`;
  },
  "log.rescue.melee": () =>
    "ZÁCHRANA VELITELE: Nepřítel poutající maršála padl v souboji muže proti muži!",
  "log.weapon.emptyOverwatch": (p, ctx) =>
    `Zbraň postavy ${gen(ctx, p.unitId)} je vybitá! Nelze přejít do Střelecké hlídky / Připravené salvy bez nabité hlavně.`,
  "log.overwatch.needAp": (p, ctx) =>
    `Připravená salva pro těžkou mušketu s furketou (${ctx.weapon(p.weaponId)}) vyžaduje ${p.required ?? 0} AP!`,
  "log.overwatch.cone": (p, ctx) =>
    `${nom(ctx, p.unitId)} zamířil přední kužel: PŘIPRAVENÁ SALVA (kužel ${p.facing}).`,
  "log.overwatch.360": (p, ctx) =>
    `${nom(ctx, p.unitId)} přešel do režimu STŘELECKÁ HLÍDKA (360°).`,
  "log.ability.cloak": (p, ctx) => {
    const hp = p.keptWound ? "" : "+3 HP, ";
    const rescued = p.rescued ? ", VYPROŠTĚN ZE ZADRŽENÍ" : "";
    return `[SCHOPNOST — ${ctx.ability(p.abilityId)}] ${nom(ctx, p.unitId)} přiskočil k maršálovi, přehodil přes něj těžký plášť (+2 Zbroj, ${hp}+1 AP, kouřová clona 3×3${rescued})!`;
  },
  "log.ability.verdict": (p, ctx) =>
    `[SCHOPNOST — ${ctx.ability(p.abilityId)}] ${nom(ctx, p.unitId)} ukryl doutnák pod klobouk a nasypal posvěcený suchý prach: +35 % Zásah, +45 % Krit, +3 DMG, +2 Průraz zbroje, ignoruje kryt zídek, 0 % Selhání v dešti a zisk +1 AP!`,
  "log.ability.shrapnel": (p, ctx) => {
    const keg = p.keg ? ` + ŘETĚZOVÁ DETONACE PRACHU na [${p.kegX}, ${p.kegZ}]!` : "";
    const foes = ctx.plural(p.count ?? 0, "nepřítele", "nepřátele", "nepřátel");
    return `[SCHOPNOST — ${ctx.ability(p.abilityId)}] ${nom(ctx, p.unitId)} odpálil maltézskou pekelnou salvu: zasáhl ${p.count ?? 0} ${foes} železným šrapnelem (−3 HP, −2 Zbroj, Omráčení), zahalil se do kouře (3×3) a doplnil si +1 petardu${keg}!`;
  },
  "log.ability.command": (p, ctx) =>
    `[SCHOPNOST — ${ctx.ability(p.abilityId)}] Maršál Colloredo vydal autoritativní rozkaz k obraně a průlomu! Všichni spojenci získávají +2 AP a rozšířené zorné pole.`,
  "log.rescue.grenade": () =>
    "ZÁCHRANA VELITELE: Výbuch petardy smetl švédského věznitele a maršál Colloredo je opět volný!",
  "log.detained.grenade": () =>
    "POZOR (ZADRŽEN 1/2 KOLA): Maršál Colloredo se po výbuchu ocitl bez ochrany v blízkosti Švéda! Máte 1 kolo na to, abyste k němu přivedli spojence a vyprostili jej!",
  "log.grenade": (p, ctx) => {
    const keg = p.keg ? ` SUD NA [${p.kegX}, ${p.kegZ}] DETONOVAL!` : "";
    return `${nom(ctx, p.attackerId)} hodil petardu na [${p.x}, patro ${p.y}, ${p.z}] — výbuch 3×3 (${p.count ?? 0} zasaženo za ${p.damage ?? 0} HP, −${p.shred ?? 0} zbroj a dým)${keg}!`;
  },
  "log.door.toggle": (p, ctx) => {
    const verb = p.open ? "otevřel" : "zavřel";
    return `${nom(ctx, p.unitId)} ${verb} ${ctx.door(p.doorId)} (${p.x}, ${p.z}, P${p.y}) jako volnou akci (0 AP).`;
  },
  "log.deathThroes.colloredoBoat": () =>
    "Polní maršál Colloredo v Posledním vzepětí nedokázal dosáhnout rybářské pramice a podlehl zraněním!",
  "log.deathThroes.hero": (p, ctx) =>
    `${nom(ctx, p.heroId)} vyčerpal své Poslední vzepětí a padl k zemi s čistým štítem.`,
  "log.round.enemy": (p) => `--- Kolo ${p.count}: Aktivita švédské hlídky ---`,
  "log.deathThroes.enemy": (p, ctx) =>
    `${nom(ctx, p.unitId)} vyčerpal své Poslední vzepětí, podlehl zraněním a padl k zemi.`,
  "log.door.enemy": (p, ctx) => `${nom(ctx, p.unitId)} rozrazil křídlo dveří!`,
  "log.capture.adjacent": (p, ctx) =>
    `${nom(ctx, p.unitId)} přistoupil těsně k hraběti Colloredovi, utratil 1 AP a zajímá jej!`,
  "log.capture.gunpoint": (p, ctx) => {
    const tiles = ctx.plural(p.distance ?? 0, "pole", "pole", "polí");
    return `${nom(ctx, p.unitId)} namířil nabitou mušketu na hraběte Colloreda (${p.distance ?? 0} ${tiles}), utratil 1 AP a drží jej v šachu: „Stůjte, pane hrabě! Ani hnutí!“ — Hrabě Colloredo je zajat!`;
  },
  "log.capture.threatAdjacent": (p, ctx) =>
    `POZOR (HROZBA ZAJETÍ): ${nom(ctx, p.unitId)} pronikl těsně k hraběti Colloredovi, ale vyčerpal AP na přesun! Pokud jej v příštím tahu nezlikvidujete nebo neustoupíte, hrabě bude zajat!`,
  "log.capture.threatGunpoint": (p, ctx) => {
    const tiles = ctx.plural(p.distance ?? 0, "pole", "pole", "polí");
    return `POZOR (HROZBA ZAJETÍ): ${nom(ctx, p.unitId)} namířil nabitou mušketu na hraběte Colloreda (${p.distance ?? 0} ${tiles}), ale vyčerpal AP na pohyb! Pokud v příštím tahu nezrušíte přímou viditelnost nebo jej nezlikvidujete, hrabě bude zajat!`;
  },
  "log.detained.enemyShot": () =>
    "POZOR (ZADRŽEN 1/2 KOLA): Maršál Colloredo je bez eskorty v dosahu Švéda! Přiveďte k němu v příštím kole spojence a vyčistěte okolí, jinak bude na konci příštího kola zajat!",
  "log.enemy.shot": (p, ctx) => {
    if (p.misfired) {
      return `${nom(ctx, p.attackerId)} chtěl vystřelit na ${acc(ctx, p.targetId)}, ale doutnák v dešti selhal!`;
    }
    if (p.hit) {
      const shred = (p.shred ?? 0) > 0 ? ` (−${p.shred} zbroj)` : "";
      const crit = p.critical ? " (KRITICKÝ!)" : "";
      return `${nom(ctx, p.attackerId)} zasáhl ${acc(ctx, p.targetId)} (${p.chance ?? 0} %) za ${p.damage ?? 0} HP${shred}${crit}!`;
    }
    return `${nom(ctx, p.attackerId)} vystřelil na ${acc(ctx, p.targetId)} (${p.chance ?? 0} %), ale minul.`;
  },
  "log.enemy.throesMelee": (p, ctx) =>
    p.hit
      ? `${nom(ctx, p.attackerId)} v Posledním vzepětí udeřil pažbou do ${gen(ctx, p.targetId)} za ${p.damage ?? 0} HP!`
      : `${nom(ctx, p.attackerId)} v Posledním vzepětí máchl pažbou po ${nom(ctx, p.targetId)}, ale minul.`,
  "log.enemy.reload": (p, ctx) =>
    p.loaded
      ? `${nom(ctx, p.unitId)} dokončil nabíjení muškety (${p.required ?? 0}/${p.required ?? 0} AP) s papírovou patronou!`
      : `${nom(ctx, p.unitId)} fázově nabíjí mušketu (${p.progress ?? 0}/${p.required ?? 0} AP).`,
  "log.enemy.overwatch": (p, ctx) =>
    `${nom(ctx, p.unitId)} zaujal kryt a drží Připravenou salvu (kužel ${p.facing}).`,
  "log.warn.reinforcement.3": () =>
    "VÝSTRAHA: Z Mostecké ulice zazněly polnice švédských dragounů! Generál Königsmarck vysílá posily, máte 2 kola k dosažení rybářské pramice!",
  "log.warn.reinforcement.4": () =>
    "NEBEZPEČÍ: Dusot kovaných kopyt se blíží k severní bráně! Švédská jízda vtrhne do zahrady v příštím kole!",
  "log.reinforcement.arrive": () =>
    "POPLACH: Švédské posily z Mostecké ulice prorazily severní bránu! 2 těžcí jezdci (Královský dragoun a Švédský kyrysník) vpadli do zahrady!",
  "log.round.player": (p) => `--- Kolo ${p.count}: Útěk velkopřevora Colloreda ---`,
  "log.m2.round.player": (p) => `--- Kolo ${p.count}: Obrana Staroměstské mostecké věže ---`,
  "log.m3.round.player": (p) => `--- Kolo ${p.count}: Výsadek v prachovém dvoře ---`,

  "banner.alarm": () => "POPLACH! DO KRYTU!",
  "banner.captured": () => "ZAJAT ŠVÉDY! (2/2)",
  "banner.spotted": () => "SPATŘEN V POHYBU!",
  "banner.misfire": () => "SELHÁNÍ!",
  "banner.ambush": () => "PŘEPAD ZE ZÁLOHY!",
  "banner.detainedHalf": () => "ZADRŽEN! (1/2)",
  "banner.hiddenFog": () => "SKRYT V ŠEROSVITU",
  "banner.outOfCharge": () => "MIMO DOSAH ZTEČE",
  "banner.charge": () => "ZTEČ ZBLÍZKA!",
  "banner.buttSpill": () => "ÚDER PAŽBOU! (PRACH VYSYPÁN)",
  "banner.chargeFree": () => "ZTEČ A SEK! (+0 AP)",
  "banner.buttStrike": () => "ÚDER PAŽBOU!",
  "banner.meleeStrike": () => "ÚDER ZBLÍZKA!",
  "banner.outOfSight": () => "MIMO ZORNÉ POLE",
  "banner.detonate": () => "ODPAL SUDU!",
  "banner.kegBlast": () => "VÝBUCH SUDU −5 HP!",
  "banner.freed": () => "VYPROŠTĚN!",
  "banner.pistolEmpty": () => "BAMBITKA VYBITÁ!",
  "banner.barrelEmptyProgress": (p) => `HLAVEŇ VYBITÁ! (${p.progress ?? 0}/${p.required ?? 0} AP)`,
  "banner.needTwoApStill": () => "VYŽADUJE 2 AP BEZ POHYBU!",
  "banner.critDamage": (p) => `KRITICKÝ ZÁSAH −${p.damage ?? 0} HP!`,
  "banner.critShort": (p) => `KRIT −${p.damage ?? 0}`,
  "banner.damage": (p) => `−${p.damage ?? 0} HP`,
  "banner.miss": () => "VEDLE",
  "banner.pistolNoReload": () => "BAMBITKA NELZE NABÍT!",
  "banner.alreadyLoaded": () => "HLAVEŇ JIŽ NABITA!",
  "banner.needOneAp": () => "NEDOSTATEK AP! (VYŽADUJE 1 AP)",
  "banner.reloadDone": (p) => `PLNĚ NABITO! (${p.required ?? 0}/${p.required ?? 0})`,
  "banner.reloadStep": (p) => `NABÍJENÍ ${p.progress ?? 0}/${p.required ?? 0} (1 AP)`,
  "banner.barrelEmpty": () => "HLAVEŇ VYBITÁ!",
  "banner.needAp": (p) => `VYŽADUJE ${p.required ?? 0} AP!`,
  "banner.overwatchCone": () => "PŘIPRAVENÁ SALVA",
  "banner.overwatch360": () => "STŘELECKÁ HLÍDKA 360°",
  "banner.critShortBang": (p) => `KRIT −${p.damage ?? 0}!`,
  "banner.missedPlain": () => "MINUL",
  "banner.meleeMiss": () => "MINUTÍ ZBLÍZKA",
  "banner.misfireMatchcord": () => "SELHÁNÍ DOUTNÁKU!",
  "banner.hipFire": () => "STŘELBA OD BOKU! (OTŘESEN)",
  "banner.cloakFreed": () => "VYPROŠTĚN! +2 ZBROJ · +3 HP · DÝM",
  "banner.cloak": () => "OCHRANNÝ PLÁŠŤ! +2 ZBROJ · +3 HP · DÝM",
  "banner.oath": () => "PŘÍSAHA KOMORNÍKA! [OCHRANA VELITELE]",
  "banner.verdict": () => "SVATOVÁCLAVSKÝ ORTEL! 100% ZÁSAH · +3 DMG · +1 AP",
  "banner.shrapnel": () => "PEKELNÁ BOUŘE & ŠRAPNEL! +1 PETARDA",
  "banner.shrapnelHit": () => "ŠRAPNEL −3 HP · −2 ZBROJ · OMRÁČEN!",
  "banner.command": () => "ROZKAZ MARŠÁLA! [+2 AP SPOJENCŮM]",
  "banner.plusTwoAp": () => "+2 AKČNÍ BODY!",
  "banner.grenadeBlast": (p) => `VÝBUCH −${p.damage ?? 0}`,
  "banner.fallen": () => "PADL V BOJI",
  "banner.fallenThroes": () => "PADL (POSLEDNÍ VZEPĚTÍ)",
  "banner.gunpoint": () => "DRŽÍ V ŠACHU (1 AP)",
  "banner.captureAp": () => "ZAJETÍ (1 AP)",
  "banner.threat": () => "HROZBA ZAJETÍ! (1/2)",
  "banner.preparedVolley": () => "PŘIPRAVENÁ SALVA",
  "banner.loaded": (p) => `NABITO (${p.required ?? 0}/${p.required ?? 0})`,
  "banner.reloading": (p) => `NABÍJENÍ ${p.progress ?? 0}/${p.required ?? 0}`,
  "banner.instantKill": () => "OKAMŽITĚ PADL!",
  "banner.eliminated": () => "VYŘAZEN!",
  "banner.deathThroes": () => "POSLEDNÍ VZEPĚTÍ!",
  "banner.criticalPierce": () => "KRITICKÝ PRŮSTŘEL!",
  "banner.hit": () => "ZÁSAH!",
  "banner.armorBounce": () => "ODRAŽENO KYRYSEM!",
  "banner.missedShot": () => "MINUTÍ",
  "banner.inSights": () => "V mušce",
  "banner.armorLost": (p) => `−${p.shred ?? 0} ZBROJ`,

  "mod.weaponAccuracy": (p, ctx) => `Základní přesnost (${ctx.weapon(p.weaponId) || ctx.melee(p.meleeId)})`,
  "mod.weaponAccuracy.fork": () => "Dlouhá hlaveň + stabilita opěrné vidlice (furkety)",
  "mod.weaponAccuracy.wheel": () => "Kolečkový zámek (rychlý zážeh jiskrou)",
  "mod.weaponAccuracy.short": () => "Kratší hlaveň, střelba z ruky bez opory (Model 1624)",
  "mod.marksmanship": (p, ctx) => `Střelecká zkušenost (${nom(ctx, p.unitId)})`,
  "mod.unitRole": (p, ctx) => ctx.role(p.unitId),
  "mod.pointBlank": (p, ctx) =>
    `Střelba zblízka (${p.distance ?? 0} ${ctx.plural(p.distance ?? 0, "pole", "pole", "polí")})`,
  "mod.pointBlank.detail": () => "Zaručený soustřel na krátkou vzdálenost",
  "mod.falloff": (p, ctx) =>
    `Velká vzdálenost hladké hlavně (${p.distance ?? 0} ${ctx.plural(p.distance ?? 0, "pole", "pole", "polí")})`,
  "mod.falloff.detail": (p, ctx) =>
    `Nad optimální dostřel (${p.optimal ?? 0} ${ctx.plural(p.optimal ?? 0, "pole", "pole", "polí")})`,
  "mod.optimal": (p, ctx) =>
    `Efektivní dostřel (${p.distance ?? 0} ${ctx.plural(p.distance ?? 0, "pole", "pole", "polí")})`,
  "mod.optimal.detail": () => "Bez postihu za rozptyl kule",
  "mod.coverHalf": (p) => `Poloviční kryt cíle (směr ${p.dir ?? ""})`,
  "mod.coverHalf.detail": () => "Gabion, nízká zídka nebo převržený vůz",
  "mod.coverFull": (p) => `Plný kryt cíle (směr ${p.dir ?? ""})`,
  "mod.coverFull.detail": () => "Kamenná zeď, pilíř nebo vozová hradba",
  "mod.flanked": () => "Nekrytý cíl / Obchvat",
  "mod.flanked.detail": (p) => `Cíl nemá kryt ze směru ${p.dir ?? ""}`,
  "mod.wallPierce": () => "Průraz překážky [Svatováclavské soustředění]",
  "mod.wallPierce.detail": () => "Těžká olověná kule proráží kamennou zídku (ruší postih krytu)",
  "mod.highGround": () => "Výšková převaha",
  "mod.highGround.detail": (p) => `Střelba z patra ${p.fromFloor ?? 0} do patra ${p.toFloor ?? 0}`,
  "mod.shooterSmoke": () => "Střelba z oblaku dýmu (−10 % muška)",
  "mod.shooterSmoke.detail": () => "Hustý dým z černého prachu na políčku střelce zhoršuje míření",
  "mod.smokePierce": () => "Průhled z výšky přes dým",
  "mod.smokePierce.detail": () => "Střelba shora přes přízemní kouř z černého prachu (−20 %)",
  "mod.targetSmoke": () => "Oblak dýmu v cíli (+15 obrana)",
  "mod.targetSmoke.detail": () => "Cíl je zahalen dýmem z černého prachu (+15 % obrana cíle)",
  "mod.pathSmoke": () => "Clona dýmu v dráze střely (+15 obrana)",
  "mod.pathSmoke.detail": () => "Střela prolétá kouřem z černého prachu (+15 % obrana cíle)",
  "mod.fog": () => "Počasí: Ranní vltavská mlha",
  "mod.fog.detail": () => "Snížená viditelnost na bojišti",
  "mod.rain": () => "Počasí: Prudký déšť",
  "mod.rain.detail": () => "Zhoršený výhled a vlhnoucí střelný prach na pánvičce",
  "mod.hipFire": () => "Nouzová střelba od boku (1 AP, bez furkety)",
  "mod.hipFire.detail": () => "Výstřel 8kg muškety z ruky (−35 % muška, zpětný ráz způsobí stav Otřesený!)",
  "mod.forkRest": () => "Rozložená furketa (opěrná vidlice, 2 AP)",
  "mod.forkRest.detail": () => "Střelec se v kole výstřelu nepohnul a stabilizoval těžkou hlaveň",
  "mod.shaken": () => "Otřesený střelec",
  "mod.shaken.detail": () => "Třes rukou pod palbou nebo po zpětném rázu těžké muškety (−20 %)",
  "mod.marshal": () => "Autorita polního maršála",
  "mod.marshal.self": () => "Válečné zkušenosti vrchního velitele (+8 %)",
  "mod.marshal.near": () => "Maršál Colloredo je do 7 polí (+8 %)",
  "mod.verdictAim": () => "Svatováclavské soustředění [Schopnost 5]",
  "mod.verdictAim.detail": () => "Suchý prach z Klementina a dokonalá balistická dráha (+35 %)",
  "mod.heroicFocus": (p, ctx) => `${ctx.ability(p.abilityId) || "Zvláštní schopnost"} [5]`,
  "mod.heroicFocus.detail": () => "Taktické odhodlání (+15 % k zásahu)",
  "mod.baseCrit": (p, ctx) => `Základní šance zbraně (${ctx.weapon(p.weaponId)})`,
  "mod.baseCrit.detail": (p) => `Bonus kritického poškození ${p.names ?? ""}`,
  "mod.flankCrit": () => "Obchvat / Nekrytý cíl",
  "mod.flankCrit.detail": () => "Střelba ze strany, kde cíl nechrání žádná překážka",
  "mod.pointBlankCrit": () => "Střelba z bezprostřední blízkosti",
  "mod.pointBlankCrit.detail": () => "Vysoká průraznost olověné kule na krátkou vzdálenost",
  "mod.armorCrit": (p, ctx) =>
    `Kvalita zbroje cíle (${p.armor ?? 0} ${ctx.plural(p.armor ?? 0, "bod", "body", "bodů")} kyrysu)`,
  "mod.armorCrit.detail": () => "Ocelový kyrys a přilba odrážejí přímé průstřely",
  "mod.verdictCrit": () => "Svatováclavské soustředění [Schopnost 5]",
  "mod.verdictCrit.detail": () => "Mířená rána na spáry švédského kyrysu (+45 % krit, +3 HP poškození)",
  "mod.pierce": () => "Průraz zbroje",
  "mod.pierce.detail": () => "Kolik bodů kyrysu cíle výstřel zcela ignoruje",
  "mod.shred": () => "Destrukce kyrysu",
  "mod.shred.detail": () => "Kolik bodů zbroje cíle výstřel při zásahu trvale zničí",
  "mod.meleeAccuracy": (p, ctx) => `Základní přesnost (${ctx.melee(p.meleeId)})`,
  "mod.meleeDesc": (p, ctx) => ctx.meleeDesc(p.meleeId),
  "mod.meleeSkill": () => "Bojová zručnost šermíře",
  "mod.colloredoMelee": () => "Zranění z Lützenu & noční košile",
  "mod.colloredoMelee.detail": () => "Maršál těžce kulhá a ohání se těžkou vybitou bambitkou (−15 %)",
  "mod.meleeHigh": () => "Výšková převaha (úder shora)",
  "mod.meleeHigh.detail": (p) => `Útok z patra ${p.fromFloor ?? 0} na patro ${p.toFloor ?? 0}`,
  "mod.meleeShaken": () => "Otřesená morálka útočníka",
  "mod.meleeShaken.detail": () => "Třes rukou po nepřátelské palbě",
  "mod.targetShaken": () => "Dezorientovaný cíl (Otřesen)",
  "mod.targetShaken.detail": () => "Cíl nestíhá krýt úder zblízka",
  "mod.meleeCrit": (p, ctx) => `Základní kritická šance (${ctx.melee(p.meleeId)})`,
  "mod.meleeCrit.detail": (p) => `Bonus kritického zásahu +${p.damage ?? 0} HP`,
  "mod.meleeArmor": (p, ctx) =>
    `Odolnost kyrysu (${p.armor ?? 0} ${ctx.plural(p.armor ?? 0, "bod", "body", "bodů")} zbroje)`,
  "mod.meleeArmor.detail": () => "Ocelový kyrys odráží sečné a tupé rány",
  "mod.bladePierce": () => "Průraz čepelí",
  "mod.bladePierce.detail": () => "Hrot zbraně ignoruje body zbroje",
  "mod.bladeShred": () => "Destrukce zbroje",
  "mod.bladeShred.detail": () => "Čepel rozsekává řemení a plech kyrysu",

  "contact.matchcord": () => "Žhnoucí doutnák v šerosvitu",
  "contact.footsteps": () => "Šramot kyrysu a kroky ve tmě",
  "contact.gunfire": () => "Záblesk pánvičky ve tmě",
  "contact.hidden": () => "Skryto v šerosvitu",
  "contact.matchcord.detail": () => "Žhnoucí doutnák doutnákové muškety. Postava sama zůstává skrytá.",
  "contact.footsteps.detail": () => "Kroky a cinkot kyrysu ve tmě. Postava sama zůstává skrytá.",
  "contact.gunfire.detail": () => "Záblesk pánvičky. Postava sama zůstává skrytá.",

  "inspect.stat.hp": () => "Zdraví",
  "inspect.stat.armor": () => "Zbroj",
  "inspect.stat.ap": () => "Akční body",
  "inspect.stat.aim": () => "Muška",
  "inspect.stat.move": () => "Pohyb",
  "inspect.stat.grenades": () => "Petardy",
  "inspect.moveValue": (p, ctx) =>
    `${p.count ?? 0} ${ctx.plural(p.count ?? 0, "pole", "pole", "polí")} / AP`,
  "inspect.cond.dead": () => "Padl",
  "inspect.cond.throes": () => "Poslední vzepětí (1 tah do pádu)",
  "inspect.cond.overkill": (p) => `Okamžitá smrt při ≤ ${p.hp ?? 0} HP`,
  "inspect.cond.detained": (p) =>
    p.names
      ? `Zadržen ${p.progress ?? 0}/2 · ${p.names}`
      : `Zadržen ${p.progress ?? 0}/2`,
  "inspect.capture.zero": () => "padl na 0 HP",
  "inspect.capture.surrounded": () => "obklíčen bez ochrany",
  "inspect.capture.fallen": () => "všichni druhové padli",
  "inspect.cond.vip": () => "Velitel k ochraně",
  "inspect.cond.shaken": () => "Otřesený",
  "inspect.cond.overwatch": () => "V hlídce",
  "inspect.cond.moved": () => "V tomto kole se pohnul",
  "inspect.cond.pistolEmpty": () => "Bambitka vybitá",
  "inspect.cond.pistolLoaded": () => "Bambitka 1/1",
  "inspect.cond.reloading": (p) => `Nabíjení ${p.progress ?? 0}/${p.required ?? 0}`,
  "inspect.weapon.lock": () => "Zámek",
  "inspect.weapon.damage": () => "Poškození",
  "inspect.weapon.critBonus": () => "Kritický bonus",
  "inspect.weapon.baseCrit": () => "Základní krit",
  "inspect.weapon.baseAim": () => "Základní přesnost",
  "inspect.weapon.pointBlank": () => "Bodový dostřel",
  "inspect.weapon.optimal": () => "Optimální dostřel",
  "inspect.weapon.max": () => "Maximální dostřel",
  "inspect.weapon.falloff": () => "Pokles přesnosti",
  "inspect.weapon.pierce": () => "Průraz zbroje",
  "inspect.weapon.shred": () => "Stržení zbroje",
  "inspect.weapon.misfire": () => "Selhání",
  "inspect.weapon.fork": () => "Furketa",
  "inspect.yes": () => "Ano",
  "inspect.no": () => "Ne",
  "inspect.weapon.fireCost": () => "Cena výstřelu",
  "inspect.weapon.reload": () => "Nabíjení",
  "inspect.weapon.mobility": () => "Postih pohybu",
  "inspect.weapon.limpOverrides": () => "Kulhání má přednost před vahou zbraně",
  "inspect.tiles": (p, ctx) => `${p.count ?? 0} ${ctx.plural(p.count ?? 0, "pole", "pole", "polí")}`,
  "inspect.weapon.overwatch": () => "Střelecká hlídka",
  "inspect.weapon.cone": () => "Připravená salva v kuželu",
  "inspect.weapon.circle": () => "Kruhová střelecká hlídka",
  "inspect.weapon.hip": (p) => `1 AP, −${p.count ?? 0} % muška, otřesení`,
  "inspect.melee.kind": () => "Druh",
  "inspect.melee.desc": () => "Popis",
  "inspect.melee.stun": () => "Omráčení",
  "inspect.melee.spill": () => "Úder vysype rozpracované nabíjení",
  "inspect.lock.matchlock": () => "Doutnákový zámek",
  "inspect.lock.wheellock": () => "Kolečkový zámek",
  "inspect.meleeKind.sword": () => "Meč",
  "inspect.meleeKind.dagger": () => "Dýka",
  "inspect.meleeKind.polearm": () => "Sudlice",
  "inspect.meleeKind.pistol_butt": () => "Pažba pistole",
  "inspect.meleeKind.musket_butt": () => "Pažba muškety",
  "inspect.meleeKind.fist": () => "Pěst",
  "inspect.cover.none": () => "Žádný",
  "inspect.cover.half": () => "Poloviční",
  "inspect.cover.full": () => "Plný",
  "inspect.dir.N": () => "Sever",
  "inspect.dir.E": () => "Východ",
  "inspect.dir.S": () => "Jih",
  "inspect.dir.W": () => "Západ",
  "inspect.surface.cobble": () => "Dlážděná ulice",
  "inspect.surface.stone_floor": () => "Kamenná podlaha",
  "inspect.surface.palace_carpet": () => "Palácový koberec",
  "inspect.surface.wood_roof": () => "Dřevěná střecha",
  "inspect.surface.rubble": () => "Suť",
  "inspect.surface.scorched_ruin": () => "Ohořelá ruina",
  "inspect.surface.water": () => "Voda Čertovky",
  "inspect.surface.water.vltava": () => "Voda Vltavy",
  "inspect.surface.wood_dock": () => "Dřevěné molo",
  "inspect.obstacle.none": () => "Žádná",
  "inspect.obstacle.low_wall": () => "Nízká zídka",
  "inspect.obstacle.high_wall": () => "Vysoká zeď",
  "inspect.obstacle.pillar": () => "Pilíř",
  "inspect.obstacle.powder_keg": () => "Prachový sud",
  "inspect.stair.none": () => "Žádné",
  "inspect.stair.straight_stairs": () => "Přímé schodiště",
  "inspect.stair.spiral_stairs": () => "Točité schodiště",
  "inspect.stair.ladder": () => "Žebřík",
  "inspect.stair.grand_stairs": () => "Monumentální schodiště",
  "inspect.floor.0": () => "Přízemí (P0)",
  "inspect.floor.1": () => "Piano Nobile (P1)",
  "inspect.floor.2": () => "Maltézská věž (P2)",
  "inspect.floor.m2.0": () => "Průjezd a práh (P0)",
  "inspect.floor.m2.1": () => "Síň s rumpálem (P1)",
  "inspect.floor.m2.2": () => "Ochoz pod střechou (P2)",
  "inspect.floor.m3.0": () => "Prachový dvůr a sklad (P0)",
  "inspect.floor.m3.1": () => "Krytá lodžie (P1)",
  "inspect.unexplored.title": () => "Neprozkoumáno",
  "inspect.unexplored.summary": () =>
    "Toto pole je stále v temnotě. Kryt, dveře ani překážky odtud nejsou vidět.",
  "inspect.empty.title": () => "Prázdné pole",
  "inspect.empty.summary": () => "Na těchto souřadnicích není dlaždice.",
  "inspect.line.coord": () => "Souřadnice",
  "inspect.line.floor": () => "Patro",
  "inspect.line.surface": () => "Povrch",
  "inspect.line.move": () => "Pohyb",
  "inspect.walkable": () => "Pochozí",
  "inspect.blocked": () => "Nepochozí",
  "inspect.line.flooring": () => "Podlaha",
  "inspect.line.damage": () => "Poškození",
  "inspect.damage.0": () => "Neporušené",
  "inspect.damage.1": () => "Rozstřílené",
  "inspect.damage.2": () => "Ohořelá ruina",
  "inspect.line.smoke": () => "Kouř",
  "inspect.smokeTurns": (p, ctx) =>
    `${p.count ?? 0} ${ctx.plural(p.count ?? 0, "kolo", "kola", "kol")}`,
  "inspect.smokeNone": () => "Žádný",
  "inspect.line.escape": () => "Únik",
  "inspect.escape.yes": () => "Rybářská pramice",
  "inspect.escape.m3.yes": () => "Pramice výsadku",
  "inspect.line.obstacle": () => "Překážka",
  "inspect.line.blast": () => "Výbuch",
  "inspect.blastValue": () => "3×3, 5 HP, 2 zbroj, kouř",
  "inspect.line.stairs": () => "Schody",
  "inspect.line.stairDir": () => "Směr schodů",
  "inspect.line.stairLink": () => "Spojuje patra",
  "inspect.line.door": () => "Dveře",
  "inspect.line.doorState": () => "Stav dveří",
  "inspect.door.open": () => "Otevřené",
  "inspect.door.closed": () => "Zavřené",
  "inspect.line.axis": () => "Osa",
  "inspect.axis.ew": () => "Východ–západ",
  "inspect.axis.ns": () => "Sever–jih",
  "inspect.line.leaves": () => "Křídla",
  "inspect.leaves.double": () => "Dvoukřídlé",
  "inspect.leaves.single": () => "Jednokřídlé",
  "inspect.shrouded": () =>
    "Pole už družina spatřila. Živé postavy, které teď nejsou v dohledu, se tu nezobrazují.",
  "inspect.visible": () => "Pole je v přímém dohledu.",
  "inspect.ability.meta": (p, ctx) => {
    const renew = ctx.plural(p.required ?? 0, "kolo", "kola", "kol");
    return `Cena ${p.count ?? 0} AP · obnovení ${p.required ?? 0} ${renew} · zbývá ${p.progress ?? 0}`;
  },
  "inspect.combat.hit": () => "Zásah",
  "inspect.combat.crit": () => "Krit",
  "inspect.combat.wound": () => "Zranění",
  "inspect.combat.misfire": () => "Selhání",
  "inspect.close": () => "Zavřít úplný přehled",
  "inspect.closeKeys": () => "Zavřít [F1 / 0 / Esc]",
  "inspect.none.title": () => "Žádný výběr",
  "inspect.none.detail": () =>
    "Vyberte vojáka, nebo podržte F1 či 0 a klepněte na postavu, dveře nebo terén.",
  "inspect.contact.title": () => "Kontakt v šerosvitu",
  "inspect.contact.silent": () =>
    "Žádný doutnák, krok ani záblesk. Podrobnosti zůstávají skryté.",
  "inspect.contact.distance": (p) => {
    const tiles = p.distance ?? 0;
    const rounded = Number.isInteger(tiles) ? String(tiles) : tiles.toFixed(1);
    return `${rounded} polí od nejbližšího obránce`;
  },
  "inspect.unit.enemy": () => "Přehled nepřítele",
  "inspect.unit.player": () => "Přehled obránce",
  "inspect.faction.enemy": () => "Švédská hlídka",
  "inspect.faction.player": () => "Obránce Prahy",
  "inspect.combat.shotTitle": () => "Výstřel na tento cíl",
  "inspect.combat.meleeTitle": () => "Úder na tento cíl",
  "inspect.combat.pierceLine": (p) => `průraz ${p.count ?? 0} · stržení ${p.shred ?? 0}`,
  "inspect.weapon.hipLabel": () => "Střelba od boku",
  "inspect.weapon.falloffValue": (p) => `${p.count ?? 0} % / pole`,
  "inspect.melee.accuracy": () => "Přesnost",

  "log.m2.briefing.gate": () =>
    "26. července 1648, ráno: Švédští harcovníci běží po holém pískovci Karlova mostu ke Staroměstské mostecké věži.",
  "log.m2.briefing.ward": () =>
    "Stráž věže je drží na prahu. Jeden okultista jde za nimi rozvázat svorník. Spusťte mříž, dokud stráž drží.",
  "log.m2.inscription": () =>
    "Pod střechou je palindrom: Signa te, signa, temere me tangis et angis. Pokleknutí stojí 1 AP a přidá obřadu jedno kolo.",
  "log.m2.kneel": () =>
    "Jiří Plachý klečí u nápisu. Obřad na svorníku teď potřebuje ještě jedno nepřerušené kolo.",
  "log.m2.victory": () =>
    "Železná mříž dosedla, dokud stráž věže držela. Kdo zůstal za železem, zůstane za ním.",
  "log.m2.loss.rite": () =>
    "Okultista dokončil obřad na svorníku dřív, než mříž dosedla. Stráž věže padla.",
  "log.m2.loss.plachy": () =>
    "Jiří Plachý padl. Bez něj se mříž nespustí a věž se neudrží.",
  "log.m2.loss.wiped": () => "Všichni obránci věže padli.",
  "log.m2.loss.windlass": () =>
    "Rumpál je rozstřílen dřív, než mříž dosedla. Průjezd zůstane otevřený.",
  "log.m2.windlassShot": (p, ctx) =>
    p.hit
      ? `${ctx.unit(p.unitId, "nom")} trefuje rumpál (${p.damage ?? 0} HP, zbývá ${p.hp ?? 0}).`
      : `${ctx.unit(p.unitId, "nom")} míjí rumpál.`,
  "log.m2.oath.accept": (p, ctx) =>
    `${ctx.unit(p.unitId, "nom")} přijímá přísahu krve a železa.`,
  "log.m2.oath.refuse": (p, ctx) =>
    `${ctx.unit(p.unitId, "nom")} přísahu odmítá. Jeho jméno zůstává.`,
  "log.m2.oath.fallen": (p, ctx) =>
    `${ctx.unit(p.unitId, "nom")} se přísahy nedožil.`,
  "log.m2.unpin": () =>
    "Západka rumpálu je vyražena! Zátěž mříže drží napnuté konopné kotevní lano.",
  "log.m2.ropeCut": () =>
    "Kotevní lano je přeťato! Železná mříž se řítí dolů a s hromovým rachotem dosedá do prahu.",
  "log.m2.douse": () =>
    "Oheň na dřevěném rumpálu byl uhašen pískem a vodou!",
  "log.m2.pitch.thrown": () =>
    "Harcovník mrštil smolnou láhev! Dřevěný rumpál vzplanul (3 poškození za kolo).",

  "log.m3.briefing": () =>
    "Noc z 27. na 28. července 1648. Mříž na Staroměstské věži je dole. Pramice výsadku přiráží k Čertovce za malostranskými mosteckými věžemi.",
  "log.m3.watergate": () =>
    "Přeživší od Čertovky jmenoval vodní branku. Na dvůr s vámi nevstupuje.",
  "log.m3.cord.lay": () => "Na dlažbu přibyl článek doutnáku.",
  "log.m3.spark.light": () => "Doutnák hoří.",
  "log.m3.spark.advance": () => "Jiskra postoupila po doutnáku.",
  "log.m3.spark.stamp": () => "Jiskra je zašlápnutá.",
  "log.m3.stamp.warn": () =>
    "Stojí u jiskry. Zašlápne ji na začátku příštího švédského tahu.",
  "log.m3.spark.relight": () => "Doutnák znovu hoří.",
  "log.m3.cart.roll": () => "Kára se hnula k bráně.",
  "log.m3.cart.delivery": (p) => `Kára projela branou. Káry ${p.count ?? 0}/3.`,
  "log.m3.cart.drop": () => "Kára zůstala stát. Sud leží na dlažbě.",
  "log.m3.tackle": () => "Postraňky jsou přeříznuté. Kára stojí.",
  "log.m3.silent.break": (p) => {
    const word =
      p.reason === "shot"
        ? "výstřel"
        : p.reason === "blast"
          ? "výbuch"
          : p.reason === "melee"
            ? "čepel"
            : p.reason === "cord"
              ? "doutnák"
              : p.reason === "tackle"
                ? "postraňky"
                : "oheň pochodně";
    return `Ticho padlo. Příčina: ${word}.`;
  },
  "log.m3.cone.show": () => "Dělmistr odkryl kartáčový kužel. Tento tah ještě nestřílí.",
  "log.m3.cone.fire": () => "Kartáč vyšel z hlavně.",
  "log.m3.cookoff": () =>
    "Sklad vzplanul a dvůr lehl popelem. Voda v Čertovce zůstala nedotčena.",
  "log.m3.victory.mute": () =>
    "Prachový dvůr vzplanul a brána baterie nedostala ani jednu káru. Za úsvitu baterie mlčela. Věž držela.",
  "log.m3.victory.scar": () =>
    "Prachový dvůr vzplanul. Baterie za úsvitu promluvila jednou a věž držela.",
  "log.m3.loss.delivery": () =>
    "Třetí kára projela branou baterie dřív, než jiskra vešla do dveří skladu.",
  "log.m3.loss.plachy": () => "Jiří Plachý padl. Bez něj se zpráva o doutnáku nevrátí.",
  "log.m3.loss.wiped": () => "Celý výsadek padl.",
  "log.m3.relief": (p) =>
    p.dir === "west"
      ? "Západní vrata se otevřela. Švédská posila vstupuje na dvůr."
      : "Jižní vrata se otevřela. Švédská posila vstupuje na dvůr.",
  "log.m3.climb": (p) => {
    if (p.climb === "down") return "Sestup skončil.";
    if (p.unitId === "player-ondrej") return "Ondřej je na lodžii.";
    return "Výsadek je na lodžii.";
  },
} satisfies Record<string, MessageFn>;

export type MessageId = keyof typeof csMessages;
