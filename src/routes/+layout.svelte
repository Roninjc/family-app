<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import BottomNav from '../components/bottomNav.svelte'

  export let data

  $: ({ supabase, session } = data)
  $: signupNoticeCode = $page.url.searchParams.get('signup_notice')
  $: signupNoticeMessage =
    signupNoticeCode === 'member_link_already_claimed'
      ? 'Tu cuenta se creó correctamente, pero ese miembro ya está vinculado a otra cuenta.'
      : null

  onMount(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth')
      }
    })

    return () => subscription.unsubscribe()
  })
</script>

{#if signupNoticeMessage}
  <div class="signup-notice" role="status">
    {signupNoticeMessage}
  </div>
{/if}

<slot />
{#if session}
  <BottomNav />
{/if}

<style lang="scss">
  :global(:root) {
    --app-bg:
      radial-gradient(circle at 10% 14%, rgba(235, 223, 204, 0.34), transparent 34%),
      radial-gradient(circle at 86% 10%, rgba(226, 212, 194, 0.34), transparent 30%),
      radial-gradient(circle at 22% 78%, rgba(208, 216, 194, 0.24), transparent 36%),
      #f1ece4;
    --app-bg-deep: #f1ece4;
    --surface-soft: rgba(255, 255, 255, 0.34);
    --surface-strong: rgba(255, 255, 255, 0.56);
    --glass-surface: rgba(250, 247, 243, 0.56);
    --glass-surface-strong: rgba(255, 254, 251, 0.78);
    --glass-border: rgba(236, 226, 212, 0.9);
    --glass-border-soft: rgba(219, 205, 188, 0.62);
    --glass-shadow:
      0 16px 34px rgba(79, 66, 53, 0.13),
      inset 0 1px 0 rgba(255, 255, 255, 0.75);
    --text-main: #2e2823;
    --text-muted: #544b43;
    --text-soft: #675c53;
    --brand: #806a54;
    --brand-soft: rgba(128, 106, 84, 0.14);
    --accent-sky: #89725f;
    --accent-sage: #72815f;
    --accent-clay: #9b7158;
    --accent-plum: #716453;
    --accent-sky-soft: rgba(137, 114, 95, 0.14);
    --accent-sage-soft: rgba(114, 129, 95, 0.14);
    --accent-clay-soft: rgba(155, 113, 88, 0.14);
    --accent-plum-soft: rgba(113, 100, 83, 0.14);
    --ok: #3f7965;
    --danger: #b23333;
    --field-border: #cbbca9;
    --field-bg: #fcfaf7;
    --radius-lg: 16px;
    --radius-md: 12px;
    --radius-pill: 999px;
    --motion-standard: cubic-bezier(0.22, 1, 0.36, 1);
    --fs-2xs: clamp(0.78rem, 0.74rem + 0.15vw, 0.84rem);
    --fs-xs: clamp(0.84rem, 0.8rem + 0.2vw, 0.9rem);
    --fs-sm: clamp(0.9rem, 0.86rem + 0.2vw, 0.98rem);
    --fs-md: clamp(1rem, 0.96rem + 0.2vw, 1.05rem);
    --fs-lg: clamp(1.12rem, 1.04rem + 0.35vw, 1.28rem);
    --fs-xl: clamp(1.35rem, 1.18rem + 0.8vw, 1.8rem);
    --lh-tight: 1.2;
    --lh-copy: 1.5;
    --nav-dock-shadow:
      0 14px 24px rgba(88, 71, 56, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.52);
    --tree-node-surface:
      linear-gradient(165deg, rgba(255, 253, 250, 0.94), rgba(242, 234, 223, 0.72));
    --tree-node-border: rgba(187, 167, 147, 0.5);
    --tree-node-shadow:
      0 14px 22px rgba(88, 69, 52, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.84);
    --tree-line-main: #85705f;
    --tree-line-soft: #a29182;
    --tree-band-a: rgba(250, 245, 238, 0.2);
    --tree-band-b: rgba(234, 225, 214, 0.12);
  }

  :global(html),
  :global(body) {
    min-height: 100%;
  }

  :global(body) {
    position: relative;
    margin: 0;
    background: var(--app-bg-deep);
    color: var(--text-main);
    font-family: 'Avenir Next', 'Gill Sans', 'Trebuchet MS', 'Noto Sans', sans-serif;
    font-size: 16px;
    line-height: var(--lh-copy);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  :global(body::before),
  :global(body::after) {
    content: '';
    position: fixed;
    inset: auto;
    pointer-events: none;
    z-index: -1;
  }

  :global(body::before) {
    width: min(52vw, 520px);
    height: min(52vw, 520px);
    top: -110px;
    right: -120px;
    background: radial-gradient(circle, rgba(198, 171, 139, 0.2), transparent 68%);
    filter: blur(10px);
    animation: float-ambient-a 16s ease-in-out infinite alternate;
  }

  :global(body::after) {
    width: min(58vw, 580px);
    height: min(58vw, 580px);
    bottom: -220px;
    left: -200px;
    background: radial-gradient(circle, rgba(173, 188, 156, 0.18), transparent 70%);
    filter: blur(14px);
    animation: float-ambient-b 19s ease-in-out infinite alternate;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(:focus-visible) {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
  }

  :global(button:focus-visible:not(:disabled)) {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
  }

  :global(button:disabled),
  :global(button[aria-disabled='true']) {
    cursor: not-allowed;
  }

  :global(button:disabled:hover),
  :global(button:disabled:active),
  :global(button[aria-disabled='true']:hover),
  :global(button[aria-disabled='true']:active) {
    scale: 1;
    transform: none;
    box-shadow: none;
  }

  :global(button:disabled:focus-visible),
  :global(button[aria-disabled='true']:focus-visible) {
    outline: none;
    box-shadow: none;
  }

  :global(.glass-panel) {
    background: linear-gradient(160deg, var(--glass-surface-strong), var(--glass-surface));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--glass-shadow);
    backdrop-filter: blur(14px) saturate(1.08);
  }

  :global(.app-btn) {
    position: relative;
    overflow: hidden;
    min-height: 44px;
    padding: 0.62rem 0.9rem;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    text-decoration: none;
    font-size: var(--fs-sm);
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition:
      transform 0.22s var(--motion-standard),
      box-shadow 0.22s var(--motion-standard),
      background-color 0.22s var(--motion-standard),
      border-color 0.22s var(--motion-standard),
      color 0.22s var(--motion-standard);
  }

  :global(.app-btn:hover:not(:disabled):not([aria-disabled='true'])) {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 12px 20px rgba(86, 46, 20, 0.18);
  }

  :global(.app-btn:active:not(:disabled):not([aria-disabled='true'])) {
    transform: translateY(0) scale(0.995);
  }

  :global(.app-btn::before) {
    content: '';
    position: absolute;
    inset: -180% 40% auto -120%;
    height: 260%;
    transform: rotate(16deg) translateX(-34%);
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.34),
      rgba(255, 255, 255, 0)
    );
    transition: transform 0.56s var(--motion-standard);
  }

  :global(.app-btn:hover:not(:disabled):not([aria-disabled='true'])::before) {
    transform: rotate(16deg) translateX(180%);
  }

  :global(.app-btn--primary) {
    background: linear-gradient(140deg, #8b745f, #9d8766);
    color: #fffdfb;
    border-color: rgba(104, 86, 69, 0.56);
  }

  :global(.app-btn--primary:hover:not(:disabled):not([aria-disabled='true'])) {
    background: linear-gradient(140deg, #806a56, #927c5f);
  }

  :global(.app-btn--secondary) {
    background: linear-gradient(160deg, rgba(252, 250, 246, 0.88), rgba(244, 237, 228, 0.78));
    color: var(--text-main);
    border-color: rgba(206, 188, 166, 0.72);
  }

  :global(.app-btn--danger) {
    background: linear-gradient(140deg, #b63e3e, #c85353);
    color: #fff;
    border-color: rgba(145, 43, 43, 0.6);
  }

  :global(.app-btn--danger:hover:not(:disabled):not([aria-disabled='true'])) {
    background: linear-gradient(140deg, #9d2f2f, #b63e3e);
  }

  :global(.app-btn--ghost) {
    background: rgba(252, 248, 243, 0.64);
    color: var(--brand);
    border-color: rgba(127, 102, 82, 0.26);
  }

  :global(.app-bottom-nav) {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch;
    gap: 8px;
  }

  :global(.app-bottom-nav a) {
    --nav-accent-rgb: 127, 102, 82;
    min-width: 0;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 11px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.01em;
    color: #332c26;
    background: rgba(253, 250, 246, 0.86);
    border: 1px solid rgba(224, 210, 193, 0.9);
    transition:
      transform 0.2s var(--motion-standard),
      background-color 0.2s var(--motion-standard),
      border-color 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard);
  }

  :global(.app-bottom-nav a:nth-child(1)) {
    --nav-accent-rgb: 114, 129, 95;
  }

  :global(.app-bottom-nav a:nth-child(2)) {
    --nav-accent-rgb: 155, 113, 88;
  }

  :global(.app-bottom-nav a:nth-child(3)) {
    --nav-accent-rgb: 137, 114, 95;
  }

  :global(.app-bottom-nav a:nth-child(4)) {
    --nav-accent-rgb: 128, 106, 84;
  }

  :global(.app-bottom-nav a:hover) {
    transform: translateY(-1px);
    box-shadow: 0 8px 14px rgba(89, 71, 54, 0.11);
  }

  :global(.app-bottom-nav a[aria-current='page']) {
    background: rgba(var(--nav-accent-rgb), 0.16);
    border-color: rgba(var(--nav-accent-rgb), 0.5);
    color: rgb(var(--nav-accent-rgb));
  }

  :global(.app-bottom-nav a[aria-current='page']::after) {
    content: '';
    position: absolute;
    left: 18%;
    right: 18%;
    bottom: 5px;
    height: 2px;
    border-radius: 999px;
    background: rgba(var(--nav-accent-rgb), 0.55);
  }

  :global(.app-nav-dock) {
    padding: 8px;
    border-radius: 15px;
    border: 1px solid rgba(224, 210, 193, 0.82);
    background: linear-gradient(160deg, rgba(252, 249, 245, 0.82), rgba(242, 236, 229, 0.58));
    backdrop-filter: blur(14px) saturate(1.07);
    box-shadow: var(--nav-dock-shadow);
  }

  :global(.page-shell) {
    width: min(1040px, 100%);
    margin: 0 auto;
    padding: max(18px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom));
  }

  :global(.app-text-link) {
    color: #7a4f35;
    text-decoration: none;
    font-weight: 600;
  }

  :global(.app-text-link:hover) {
    text-decoration: underline;
  }

  :global(.floating-input-wrapper) {
    position: relative;
    display: flex;
  }

  :global(.floating-input-wrapper .modern-input) {
    width: 100%;
    height: 40px;
    padding: 0.6rem 0.75rem 0.4rem;
    border: 1px solid var(--field-border);
    border-radius: 10px;
    background: var(--field-bg);
    font-size: var(--fs-md);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    color: var(--text-main);
  }

  :global(.floating-input-wrapper .modern-input[type='date']:not(:focus)) {
    color: transparent;
  }

  :global(.floating-input-wrapper .modern-input[type='date']:open),
  :global(.floating-input-wrapper .modern-input[type='date']:has(+ label.label-active)) {
    color: var(--text-muted);
  }

  :global(.floating-input-wrapper .modern-input::-webkit-calendar-picker-indicator) {
    filter: invert(38%) brightness(95%) contrast(80%);
  }

  :global(.floating-input-wrapper .modern-input:focus) {
    outline: none;
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgba(156, 90, 45, 0.16);
    background: #fff;
  }

  :global(.floating-input-wrapper .modern-input:focus),
  :global(.floating-input-wrapper .modern-input:valid) {
    color: var(--text-main);
  }

  :global(.floating-input-wrapper .modern-input:disabled) {
    cursor: not-allowed;
    opacity: 0.7;
  }

  :global(.floating-input-wrapper label) {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    padding: 0 6px;
    color: var(--text-soft);
    font-size: var(--fs-md);
    pointer-events: none;
    background: transparent;
    transition:
      0.2s cubic-bezier(0.4, 0, 0.2, 1) transform,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) font-size,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) color,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) top,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) background;
  }

  :global(.floating-input-wrapper .modern-input:focus + label),
  :global(.floating-input-wrapper .modern-input[type='date']:open + label),
  :global(.floating-input-wrapper label.label-active) {
    top: 2px;
    left: 12px;
    font-size: var(--fs-2xs);
    color: var(--brand);
    background: var(--field-bg);
    transform: translateY(-60%);
    padding: 0 6px;
    border-radius: 6px;
  }

  :global(.floating-input-wrapper .modern-input:valid:not(:focus) + label.label-active) {
    color: #4d8a73;
  }

  :global(.reveal-fade-up) {
    opacity: 0;
    transform: translateY(10px);
    animation: reveal-fade-up 0.52s var(--motion-standard) forwards;
  }

  :global(.reveal-delay-1) {
    animation-delay: 0.06s;
  }

  :global(.reveal-delay-2) {
    animation-delay: 0.14s;
  }

  :global(.reveal-delay-3) {
    animation-delay: 0.22s;
  }

  :global(.hover-lift) {
    transition:
      transform 0.22s var(--motion-standard),
      box-shadow 0.22s var(--motion-standard),
      border-color 0.22s var(--motion-standard);
  }

  :global(.hover-lift:hover) {
    transform: translateY(-3px);
    box-shadow: 0 14px 24px rgba(104, 60, 26, 0.16);
  }

  @keyframes reveal-fade-up {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float-ambient-a {
    from {
      transform: translate3d(0, 0, 0) scale(1);
    }

    to {
      transform: translate3d(12px, -16px, 0) scale(1.05);
    }
  }

  @keyframes float-ambient-b {
    from {
      transform: translate3d(0, 0, 0) scale(1);
    }

    to {
      transform: translate3d(-8px, 14px, 0) scale(1.04);
    }
  }

  :global(.floating-input-wrapper .modern-input:user-invalid:not(:focus) + label.label-active) {
    color: #dc2626;
  }

  :global(.floating-input-wrapper .modern-input:user-invalid:not(:focus)) {
    border-color: #dc2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
    background: #fff5f5;
  }

  :global(.modern-input:user-invalid:not(:focus)) {
    border-color: #dc2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
    background: #fff5f5;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }

    :global(body::before),
    :global(body::after) {
      animation: none !important;
    }
  }

  .signup-notice {
    position: fixed;
    top: max(10px, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    max-width: min(92vw, 680px);
    padding: 10px 14px;
    border-radius: 12px;
    background: #fff3cd;
    color: #5f4500;
    border: 1px solid #f6df96;
    box-shadow: 0 10px 24px rgba(36, 23, 0, 0.13);
    font-size: var(--fs-sm);
    line-height: 1.35;
    text-align: center;
  }
</style>
