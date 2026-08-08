<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import BottomNav from '../components/bottomNav.svelte'

  export let data
  let showTopFade = false

  const roleLabel = (role: string | null) => {
    if (role === 'admin') return 'administrador'
    if (role === 'editor') return 'editor'
    if (role === 'viewer') return 'visualizador'
    return null
  }

  const inviteContextText = (family: string | null, role: string | null) => {
    const parts: string[] = []
    if (family) parts.push(`en ${family}`)
    if (role) parts.push(`como ${role}`)
    return parts.length > 0 ? ` ${parts.join(' ')}` : ''
  }

  $: ({ supabase, user } = data)
  $: signupNoticeCode = $page.url.searchParams.get('signup_notice')
  $: signupFamily = $page.url.searchParams.get('signup_family')
  $: signupRole = roleLabel($page.url.searchParams.get('signup_role'))
  $: signupNoticeMessage =
    signupNoticeCode === 'invitation_accepted'
      ? `Tu cuenta está lista. Ya has entrado${inviteContextText(signupFamily, signupRole)}.`
      : signupNoticeCode === 'member_link_already_claimed'
        ? `Tu cuenta se creó correctamente${inviteContextText(signupFamily, signupRole)}, pero ese miembro ya está vinculado a otra cuenta.`
        : null

  function handleViewportScroll() {
    showTopFade = window.scrollY > 12
  }

  onMount(() => {
    handleViewportScroll()
    window.addEventListener('scroll', handleViewportScroll, { passive: true })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        invalidate('supabase:auth')
      }
    })

    return () => {
      window.removeEventListener('scroll', handleViewportScroll)
      subscription.unsubscribe()
    }
  })
</script>

{#if signupNoticeMessage}
  <div class="signup-notice" role="status">
    {signupNoticeMessage}
  </div>
{/if}

<slot />
<div class="viewport-fade viewport-fade-top" class:active={showTopFade} aria-hidden="true"></div>
<div class="viewport-fade viewport-fade-bottom" aria-hidden="true"></div>
{#if user || data.profile}
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
    --neu-surface: #efe8de;
    --neu-surface-soft: #f4efe7;
    --neu-light: rgba(255, 255, 255, 0.8);
    --neu-dark: rgba(154, 132, 109, 0.3);
    --neu-shadow-out:
      8px 8px 16px var(--neu-dark),
      -8px -8px 16px var(--neu-light);
    --neu-shadow-out-soft:
      5px 5px 10px rgba(154, 132, 109, 0.24),
      -5px -5px 10px rgba(255, 255, 255, 0.76);
    --neu-shadow-inset:
      inset 5px 5px 10px rgba(154, 132, 109, 0.24),
      inset -5px -5px 10px rgba(255, 255, 255, 0.76);
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
    background: var(--neu-surface);
    border: none;
    border-radius: var(--radius-lg);
    box-shadow: var(--neu-shadow-out);
  }

  :global(.app-btn) {
    position: relative;
    overflow: visible;
    min-height: 44px;
    padding: 0.62rem 0.9rem;
    border-radius: var(--radius-md);
    border: none;
    background: var(--neu-surface-soft);
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
    transform: translateY(-1px);
    box-shadow: var(--neu-shadow-out-soft);
  }

  :global(.app-btn:active:not(:disabled):not([aria-disabled='true'])) {
    transform: translateY(0);
    box-shadow: var(--neu-shadow-inset);
  }

  :global(.app-btn--primary) {
    background: #dbc8b2;
    color: #4b3a2d;
  }

  :global(.app-btn--primary:hover:not(:disabled):not([aria-disabled='true'])) {
    background: #e3d2be;
  }

  :global(.app-btn--secondary) {
    background: #f4eee6;
    color: var(--text-main);
  }

  :global(.app-btn--danger) {
    background: #e3c8c4;
    color: #7a2f2f;
  }

  :global(.app-btn--danger:hover:not(:disabled):not([aria-disabled='true'])) {
    background: #ebd4d1;
  }

  :global(.app-btn--ghost) {
    background: #f2ece4;
    color: var(--brand);
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
    background: var(--neu-surface);
    border: none;
    box-shadow: var(--neu-shadow-out-soft);
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
    box-shadow: 6px 6px 12px rgba(154, 132, 109, 0.28), -6px -6px 12px rgba(255, 255, 255, 0.8);
  }

  :global(.app-bottom-nav a[aria-current='page']) {
    background: rgba(var(--nav-accent-rgb), 0.12);
    color: rgb(var(--nav-accent-rgb));
    box-shadow: var(--neu-shadow-inset);
  }

  :global(.app-bottom-nav a[aria-current='page']::after) {
    content: '';
    position: absolute;
    left: 18%;
    right: 18%;
    bottom: 6px;
    height: 1.5px;
    border-radius: 999px;
    background: rgba(var(--nav-accent-rgb), 0.42);
  }

  :global(.app-nav-dock) {
    padding: 8px;
    border-radius: 15px;
    border: none;
    background: var(--neu-surface);
    box-shadow: var(--neu-shadow-out);
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
    border: none;
    border-radius: 10px;
    background: #f2ece4;
    font-size: var(--fs-md);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    box-shadow: var(--neu-shadow-inset);
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
    box-shadow:
      var(--neu-shadow-inset),
      0 0 0 2px rgba(156, 123, 95, 0.18);
    background: #f7f2ea;
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

    .viewport-fade {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  .viewport-fade {
    position: fixed;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 9;
    backdrop-filter: blur(6px) saturate(0.94);
    -webkit-backdrop-filter: blur(6px) saturate(0.94);
    overflow: hidden;
  }

  .viewport-fade-top {
    top: 0;
    height: max(86px, calc(env(safe-area-inset-top) + 68px));
    opacity: 0;
    transform: translateY(-4px);
    transition:
      opacity 0.24s var(--motion-standard),
      transform 0.24s var(--motion-standard);
    background: linear-gradient(
      to bottom,
      rgba(241, 236, 228, 0.54) 0%,
      rgba(241, 236, 228, 0.3) 46%,
      rgba(241, 236, 228, 0.1) 78%,
      rgba(241, 236, 228, 0) 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 45%,
      rgba(0, 0, 0, 0.34) 78%,
      rgba(0, 0, 0, 0) 100%
    );
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 45%,
      rgba(0, 0, 0, 0.34) 78%,
      rgba(0, 0, 0, 0) 100%
    );
  }

  .viewport-fade-top.active {
    opacity: 1;
    transform: translateY(0);
  }

  .viewport-fade-bottom {
    bottom: 0;
    height: max(90px, calc(env(safe-area-inset-bottom) + 74px));
    background: linear-gradient(
      to top,
      rgba(241, 236, 228, 0.56) 0%,
      rgba(241, 236, 228, 0.3) 40%,
      rgba(241, 236, 228, 0.1) 72%,
      rgba(241, 236, 228, 0) 100%
    );
    -webkit-mask-image: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 42%,
      rgba(0, 0, 0, 0.28) 74%,
      rgba(0, 0, 0, 0) 100%
    );
    mask-image: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 42%,
      rgba(0, 0, 0, 0.28) 74%,
      rgba(0, 0, 0, 0) 100%
    );
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
