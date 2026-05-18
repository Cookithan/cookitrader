import { useState, useEffect, useRef, useCallback } from "react";
import { isSupabaseEnabled } from "../lib/supabase.js";
import {
  getCommunityCookieTotal,
  getActiveBossEvent,
  createBossEvent,
  attackBoss,
  getMyBossDamage,
  getBossContributorCount,
  getBossActivity,
  subscribeBossEvent,
} from "../lib/supabaseSync.js";
import {
  MILESTONE_STEP,
  ATTACK_COOLDOWN_MS,
  FREE_DMG,
  BOOST_DMG,
  SUPER_DMG,
  ADMIN_DMG,
} from "../data/communityEvents.js";

/* ════════════════════════════════════════════════════
   useCommunityBoss — état partagé du Gâteau Géant
   ────────────────────────────────────────────────────
   Responsabilité : détecter/créer le boss du palier courant,
   suivre ses PV en temps réel (Realtime Supabase), et appliquer
   les attaques du joueur. Il NE gère PAS la récompense — c'est
   un effet dédié dans App.jsx (séparation des responsabilités,
   réutilise applyPatchOnce comme le palier 500k legacy).

   Args : { userCode, enabled }
     - enabled : false → hook inerte (Supabase off / niveau trop
       bas / pas de userCode). Le boss disparaît proprement.

   Retour :
     {
       boss,            // { milestone,bossHp,bossMaxHp,status,endsAt,... } | null
       myDamage,        // mes dégâts cumulés sur CE palier (cross-device)
       contributorCount,// nb de baristas à la rescousse (ou null)
       attack,          // (boost:boolean) => Promise<void>
       attacking,       // bool — requête d'attaque en vol
       cooldownLeftMs,  // ms restantes avant le prochain tap autorisé
     }

   Le polling du total communauté est volontairement lent (5 min) :
   c'est juste pour détecter l'apparition d'un nouveau palier. Pendant
   un boss actif, les PV viennent du Realtime (instantané), pas du poll.
═══════════════════════════════════════════════════════ */

const TOTAL_POLL_MS = 5 * 60 * 1000;

export function useCommunityBoss({ userCode, enabled }){
  const on = !!(enabled && userCode && isSupabaseEnabled());

  const [boss,             setBoss]             = useState(null);
  const [myDamage,         setMyDamage]         = useState(0);
  const [contributorCount, setContributorCount] = useState(null);
  const [activity,         setActivity]         = useState({ top:[], recent:[] });
  const [attacking,        setAttacking]        = useState(false);
  const [cooldownLeftMs,   setCooldownLeftMs]   = useState(0);

  /* Refs pour lire l'état courant dans les handlers sans les
     remettre en deps (évite de recréer subscribe/intervals). */
  const bossRef        = useRef(null);
  const lastAttackRef  = useRef(0);
  const creatingRef    = useRef(false);
  bossRef.current = boss;

  /* Adopte un event seulement s'il est ≥ au palier courant
     (un vieux UPDATE Realtime ne doit pas écraser un boss plus
     récent). */
  const adopt = useCallback((next) => {
    if(!next) return;
    setBoss(prev => {
      if(prev && next.milestone < prev.milestone) return prev;
      return next;
    });
  }, []);

  /* ── Détection / création du palier + sync initiale ────── */
  useEffect(() => {
    if(!on){ setBoss(null); setMyDamage(0); setContributorCount(null); return; }
    let cancelled = false;

    const sync = async () => {
      /* 1. Y a-t-il déjà un boss (active/defeated/failed le + récent) ? */
      const existing = await getActiveBossEvent();
      if(cancelled) return;

      /* 2. Événement UNIQUE (pas récurrent) : un seul boss, créé
            quand le cumul communautaire atteint MILESTONE_STEP
            (700 000). Une fois créé (quel que soit son statut :
            actif/vaincu/échoué) on ne le recrée JAMAIS. */
      const total = await getCommunityCookieTotal();
      if(cancelled) return;

      let current = existing;
      if(!existing
         && total >= MILESTONE_STEP
         && !creatingRef.current){
        creatingRef.current = true;
        const created = await createBossEvent(MILESTONE_STEP);
        creatingRef.current = false;
        if(cancelled) return;
        if(created) current = created;
      }

      if(current){
        adopt(current);
        const [dmg, cnt, act] = await Promise.all([
          getMyBossDamage(current.milestone, userCode),
          getBossContributorCount(current.milestone),
          getBossActivity(current.milestone),
        ]);
        if(cancelled) return;
        setMyDamage(dmg);
        setContributorCount(cnt);
        setActivity(prev => ({ top: act?.top ?? prev.top, recent: act?.recent ?? prev.recent }));
      }
    };

    sync();
    const id = setInterval(sync, TOTAL_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [on, userCode, adopt]);

  /* ── Realtime : PV partagés en direct ──────────────────── */
  useEffect(() => {
    if(!on) return;
    const unsub = subscribeBossEvent((row) => {
      const cur = bossRef.current;
      if(cur && row.milestone < cur.milestone) return;
      adopt(row);
    });
    return unsub;
  }, [on, adopt]);

  /* ── Ticker cooldown (léger : 1 setState/250ms uniquement
        pendant le cooldown) ─────────────────────────────── */
  useEffect(() => {
    if(!on) return;
    const id = setInterval(() => {
      const left = Math.max(0, ATTACK_COOLDOWN_MS - (Date.now() - lastAttackRef.current));
      setCooldownLeftMs(prev => (prev === 0 && left === 0 ? prev : left));
    }, 250);
    return () => clearInterval(id);
  }, [on]);

  /* ── Activité (podium + récents) — refresh rapide tant qu'un
        boss est ACTIF (12s). Coupe si pas de boss actif pour ne
        pas marteler la base inutilement. ──────────────────── */
  useEffect(() => {
    if(!on) return;
    let cancelled = false;
    const refresh = async () => {
      const b = bossRef.current;
      if(!b || b.status !== 'active') return;
      const [act, cnt] = await Promise.all([
        getBossActivity(b.milestone),
        getBossContributorCount(b.milestone),
      ]);
      if(cancelled) return;
      setActivity(prev => ({ top: act?.top ?? prev.top, recent: act?.recent ?? prev.recent }));
      setContributorCount(cnt);
    };
    const id = setInterval(refresh, 12_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [on]);

  /* ── Attaque ──────────────────────────────────────────── */
  const attack = useCallback(async (kind = 'free') => {
    const b = bossRef.current;
    if(!on || !b || b.status !== 'active') return;
    /* L'admin one-shot ignore le cooldown (outil de test). */
    if(kind !== 'admin' && Date.now() - lastAttackRef.current < ATTACK_COOLDOWN_MS) return;
    if(attacking) return;

    lastAttackRef.current = Date.now();
    if(kind !== 'admin') setCooldownLeftMs(ATTACK_COOLDOWN_MS);
    setAttacking(true);
    try{
      const dmg = kind === 'admin' ? ADMIN_DMG
        : kind === 'super' ? SUPER_DMG : kind === 'boost' ? BOOST_DMG : FREE_DMG;
      const storedKind = kind === 'super' || kind === 'admin' ? 'super'
        : kind === 'boost' ? 'boost' : 'tap';
      const res = await attackBoss(b.milestone, userCode, dmg, storedKind);
      if(res){
        adopt({
          milestone: res.milestone,
          bossHp:    res.bossHp,
          bossMaxHp: res.bossMaxHp,
          status:    res.status,
          endsAt:    b.endsAt,
          startedAt: b.startedAt,
        });
        setMyDamage(res.myDamage);
        if(res.applied > 0){
          /* Mon tap a compté → rafraîchit podium/récents (mon nom
             remonte dans l'activité). Best-effort, non bloquant. */
          getBossActivity(b.milestone)
            .then(act => setActivity(prev => ({ top: act?.top ?? prev.top, recent: act?.recent ?? prev.recent })))
            .catch(()=>{});
        }
      }
      return res;          // { applied, status, ... } | null — pour refund boost
    } finally {
      setAttacking(false);
    }
  }, [on, userCode, attacking, adopt]);

  return { boss, myDamage, contributorCount, activity, attack, attacking, cooldownLeftMs };
}
