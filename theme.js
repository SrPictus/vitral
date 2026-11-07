// Vitral: la identidad de SrPictus sobre Spotify. Cada carátula se vuelve luz azul
(function vitral() {
  const root = document.documentElement;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Las fuentes no bloquean el arranque: entran cuando ya se pintó la interfaz
  const fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.media = "print";
  fonts.href = "https://fonts.googleapis.com/css2?family=Anton&family=Onest:wght@400..700&display=swap";
  fonts.onload = () => (fonts.media = "all");
  document.head.append(fonts);

  // Capas del fondo: siempre el color de la paleta, sin cambiar con la canción
  const backdrop = document.createElement("div");
  backdrop.id = "vitral-backdrop";
  ["vt-aurora vt-aurora-a", "vt-scanlines"].forEach((name) => {
    const layer = document.createElement("div");
    layer.className = name;
    backdrop.append(layer);
  });
  document.body.prepend(backdrop);

  // Con Spotify en segundo plano la aurora descansa: nadie la mira y libera la tarjeta gráfica
  const syncFocus = () => root.classList.toggle("vt-away", !document.hasFocus());
  window.addEventListener("focus", syncFocus);
  window.addEventListener("blur", syncFocus);
  syncFocus();

  // Cada globito de ayuda del reproductor recalcula media ventana al montarse: pasar el ratón por
  // encima traba toda la app. Ahora solo sale si el ratón se queda quieto medio segundo.
  // React detecta "entrar" con el mouseout del elemento anterior: se retiene ese y se repite luego
  const PLAYER_BUTTON = '[data-testid="now-playing-bar"] button';
  let tooltipTimer = 0, replayingTooltip = false;
  window.addEventListener("mouseout", (event) => {
    if (replayingTooltip) return;
    const entering = event.relatedTarget?.closest?.(PLAYER_BUTTON);
    const leaving = event.target?.closest?.(PLAYER_BUTTON);
    clearTimeout(tooltipTimer);
    if (!entering || entering === leaving) return;
    event.stopImmediatePropagation();
    const from = event.target;
    tooltipTimer = setTimeout(() => {
      if (!entering.matches(":hover") || !from.isConnected) return;
      replayingTooltip = true;
      from.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, composed: true, relatedTarget: entering }));
      replayingTooltip = false;
    }, 450);
  }, true);

  // Los ojos reciben adónde mirar unas 30 veces por segundo; el movimiento lo suaviza la transición
  let pointerX = 0, pointerY = 0, pointerPending = false, pointerAt = 0;
  if (!calm) {
    window.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pointerPending || event.timeStamp - pointerAt < 33) return;
      pointerPending = true;
      requestAnimationFrame((now) => {
        pointerPending = false;
        pointerAt = now;
        if (root.classList.contains("vt-playing")) face.look(pointerX, pointerY);
      });
    }, { passive: true });
  }

  // La cara del botón de pausa: dos ojos que miran al cursor, se estiran y parpadean
  const face = (() => {
    const el = document.createElement("span");
    el.className = "vt-face";
    const eyes = [-1, 1].map((side) => {
      const eye = document.createElement("span");
      const lid = document.createElement("b");
      eye.append(lid);
      el.append(eye);
      return { side, eye, lid };
    });

    let button = null;
    let x = 0, y = 0, wide = 0, idle = 0;
    let centerX = 0, centerY = 0, measuredAt = -Infinity;

    function attach() {
      if (!button?.isConnected) {
        button = document.querySelector('[data-testid="control-button-playpause"]');
        measuredAt = -Infinity;
      }
      if (!button) return false;
      if (el.parentElement !== button) button.prepend(el);
      return true;
    }

    // Medir obliga a recalcular la página: el botón casi no se mueve, así que basta cada 3 s
    function measure(now) {
      if (now - measuredAt < 3000) return;
      measuredAt = now;
      const box = button.getBoundingClientRect();
      centerX = box.left + box.width / 2;
      centerY = box.top + box.height / 2;
    }

    function render() {
      el.style.transform = `translate(${(x * 2.5).toFixed(2)}px, ${(y * 2.5).toFixed(2)}px)`;
      for (const { side, eye } of eyes) {
        // El ojo del lado hacia donde mira se ve un poco más grande, como una cara girando
        const near = 1 + x * side * 0.14;
        const scaleX = (1 + Math.abs(x) * 0.28 + wide * 0.16) * near;
        const scaleY = (1 + wide * 0.42 + Math.abs(y) * 0.24) * near;
        eye.style.transform = `translate(${(x * 4.5).toFixed(2)}px, ${(y * 4).toFixed(2)}px) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
      }
    }

    function blink() {
      // Spotify puede rehacer el botón: aquí se recoloca aunque el ratón no se mueva
      attach();
      if (el.isConnected && root.classList.contains("vt-playing") && document.visibilityState === "visible") {
        const twice = Math.random() < 0.2;
        const closed = { transform: "scaleY(0.08)" };
        const open = { transform: "scaleY(1)" };
        eyes.forEach(({ lid }) => lid.animate(twice ? [open, closed, open, closed, open] : [open, closed, open], { duration: twice ? 320 : 150, easing: "ease-in-out" }));
      }
      setTimeout(blink, 2400 + Math.random() * 4200);
    }

    return {
      attach,
      startBlinking: blink,
      look(px, py) {
        if (!attach()) return;
        measure(performance.now());
        const dx = px - centerX;
        const dy = py - centerY;
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(distance / 150, 1);
        x = (dx / distance) * reach;
        y = (dy / distance) * reach;
        wide = Math.max(0, 1 - distance / 240);
        // Solo se indica adónde mirar: la transición del CSS la anima la tarjeta gráfica,
        // así los ojos siguen suaves aunque Spotify esté ocupado
        render();
        // Si dejas de mover el ratón un rato, vuelve a mirar al frente
        clearTimeout(idle);
        idle = setTimeout(() => {
          x = y = wide = 0;
          render();
        }, 5000);
      },
    };
  })();

  // Las paletas claras usan menos sombra: el fondo, las fotos y el brillo se suavizan desde el CSS
  const syncLightPalette = () => {
    const main = getComputedStyle(root).getPropertyValue("--vt-main").trim();
    root.classList.toggle("vt-light", parseInt(main.slice(1, 3), 16) > 128);
  };
  syncLightPalette();
  setInterval(syncLightPalette, 2000);

  function imageUrl(image) {
    return image?.startsWith("spotify:image:") ? `https://i.scdn.co/image/${image.split(":").pop()}` : image;
  }

  function animate(selector, keyframes, options) {
    if (!calm) document.querySelector(selector)?.animate(keyframes, options);
  }

  // Foto gigante de playlists y álbumes: entra grande y se desvanece hacia la página
  const HERO_ROUTE = /\/(playlist|album|artist)\//;
  const hero = document.createElement("div");
  hero.className = "vt-hero";
  const heroGhost = document.createElement("span");
  heroGhost.className = "vt-hero-ghost";
  const heroImg = document.createElement("canvas");
  heroImg.className = "vt-hero-img";
  hero.append(heroGhost, heroImg);
  for (let i = 0; i < 4; i++) hero.append(document.createElement("i"));

  let heroSource = null;
  let heroToken = 0;

  // Foto, desenfoque y desvanecido quedan pintados una vez por página en una imagen fija:
  // al hacer scroll el navegador solo la mueve, sin filtros ni máscaras en vivo
  function paintHero(img, wide) {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const width = wide ? img.naturalWidth : side;
    const height = wide ? img.naturalHeight : side;
    heroImg.width = width;
    heroImg.height = height;
    const ctx = heroImg.getContext("2d");
    ctx.drawImage(img, (img.naturalWidth - width) / 2, (img.naturalHeight - height) / 2, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = "destination-in";
    if (wide) {
      const fade = ctx.createLinearGradient(0, 0, 0, height);
      fade.addColorStop(0.4, "#000");
      fade.addColorStop(0.72, "rgba(0, 0, 0, 0.45)");
      fade.addColorStop(1, "transparent");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, width, height);
    } else {
      fadeOval(ctx, width, height);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  // Se desvanece en óvalo, como el avatar del portafolio
  function fadeOval(ctx, width, height) {
    // Centrado y llegando a cero justo en el borde: así nunca queda una línea recta
    ctx.translate(width / 2, height / 2);
    ctx.scale(1, height / width);
    const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, width / 2);
    fade.addColorStop(0.5, "#000");
    fade.addColorStop(0.78, "rgba(0, 0, 0, 0.5)");
    fade.addColorStop(1, "transparent");
    ctx.fillStyle = fade;
    ctx.fillRect(-width, -height, width * 2, height * 2);
  }

  // Inicio: saludo, buscador y la carátula que suena, en vez de la portada de anuncios
  const homeHero = document.createElement("div");
  homeHero.className = "vt-home-hero";
  const homeCover = document.createElement("canvas");
  homeCover.className = "vt-home-cover";
  const homeGreeting = document.createElement("div");
  homeGreeting.className = "vt-home-greeting";
  homeHero.append(homeCover, homeGreeting);
  for (let i = 0; i < 4; i++) homeHero.append(document.createElement("i"));

  let homeCoverUrl = null;
  let homeToken = 0;
  let userName = "";

  async function paintHomeCover() {
    const metadata = Spicetify.Player.data?.item?.metadata;
    const url = imageUrl(metadata?.image_xlarge_url ?? metadata?.image_large_url ?? metadata?.image_url);
    if (!url || url === homeCoverUrl) return;
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      return;
    }
    homeCoverUrl = url;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    homeCover.width = homeCover.height = side;
    const ctx = homeCover.getContext("2d");
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, side, side);
    ctx.globalCompositeOperation = "destination-in";
    fadeOval(ctx, side, side);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    if (!calm) homeCover.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease-out" });
  }

  // El saludo lo da Spotify ya traducido a tu idioma; el inglés solo es el último recurso
  function greetingText() {
    const native = document.querySelector(".view-homeShortcutsGrid-shortcuts")?.getAttribute("aria-label");
    const hour = new Date().getHours();
    const fallback = hour < 6 || hour >= 19 ? "Good evening" : hour < 12 ? "Good morning" : "Good afternoon";
    const hello = native?.replace(/[¡!！¿?。]/g, "").trim() || fallback;
    return userName ? `${hello}, ${userName}` : hello;
  }

  // Las secciones se reconocen por su enlace, que no cambia con el idioma
  function markShelves() {
    // Spotify a veces rehace el inicio al terminar de cargar: la cabecera vuelve a su sitio
    const page = document.querySelector('#main-view [data-testid="home-page"]');
    if (page && isHomeRoute() && homeHero.parentElement !== page) {
      page.prepend(homeHero);
      placeHomeSearch();
    }
    document.querySelectorAll("#main-view .main-gridContainer-homepageContent > section").forEach((shelf) => {
      const href = shelf.querySelector("h2 a")?.getAttribute("href") ?? "";
      shelf.classList.toggle("vt-shelf-recents", href.endsWith("/recents"));
      shelf.classList.toggle("vt-shelf-lists", href.endsWith("/section/0JQ5DAnM3wGh0gz1MXnu4d"));
    });
    if (homeHero.isConnected) homeGreeting.textContent = greetingText();
  }

  function isHomeRoute() {
    return /^\/(intl-[a-z-]+\/?)?$/i.test(Spicetify.Platform.History.location.pathname);
  }

  // El atajo real del buscador según el sistema
  if (/mac/i.test(navigator.platform)) root.style.setProperty("--vt-search-key", '"⌘ K"');

  // El buscador se coloca bajo el saludo; al bajar por la página vuelve a la barra superior
  function placeHomeSearch() {
    if (!homeHero.isConnected) return;
    const box = homeHero.getBoundingClientRect();
    const scrolled = document.querySelector("#main-view [data-overlayscrollbars-viewport]")?.scrollTop ?? 0;
    const startX = Math.round(box.left + 40);
    const startY = Math.round(box.top + scrolled + 170);
    const width = Math.round(Math.min(620, innerWidth * 0.52));
    // Destino: el hueco reservado en la barra superior, a la derecha de la casita
    const slot = document.querySelector(".oxFroaXCJTMXfoZDaaf1")?.getBoundingClientRect();
    const dockX = (slot?.left ?? 0) + 64;
    const dockY = (slot?.top ?? 8) + 0;
    root.style.setProperty("--vt-search-x", `${startX}px`);
    root.style.setProperty("--vt-search-y", `${startY}px`);
    root.style.setProperty("--vt-search-w", `${width}px`);
    root.style.setProperty("--vt-dock-x", `${Math.round(dockX - startX)}px`);
    root.style.setProperty("--vt-dock-y", `${Math.round(dockY - startY)}px`);
    root.style.setProperty("--vt-dock-scale", (474 / width).toFixed(3));
  }

  // Al entrar o salir del inicio el buscador vuela de un sitio al otro en vez de saltar:
  // se mide dónde estaba y dónde queda, y la tarjeta gráfica anima la diferencia
  function flySearch(change) {
    const box = document.querySelector(".UmbvWivEpyn9EExmm6oQ");
    if (calm || !box) {
      change();
      return;
    }
    const from = box.getBoundingClientRect();
    change();
    const to = box.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const motion = { duration: 460, easing: "cubic-bezier(.22,1,.36,1)" };
    box.animate([
      { translate: `${from.left - to.left}px ${from.top - to.top}px`, scale: `${from.width / to.width}` },
      { translate: "0px 0px", scale: "1" },
    ], motion);
    const entering = root.classList.contains("vt-home-search");
    document.querySelector(".oxFroaXCJTMXfoZDaaf1 > button")?.animate(
      [{ opacity: entering ? 1 : 0 }, { opacity: entering ? 0 : 1 }],
      motion,
    );
  }

  async function syncHome() {
    const token = ++homeToken;
    // Las letras de Spotify ocultan la página sin cambiar de ruta: el buscador del inicio se va con ella
    const mainWidth = document.querySelector("#main-view")?.getBoundingClientRect().width ?? 1;
    if (!isHomeRoute() || !mainWidth) {
      if (root.classList.contains("vt-home-search")) flySearch(() => root.classList.remove("vt-home-search"));
      homeHero.remove();
      return;
    }
    for (let tries = 0; tries < 40; tries++) {
      const page = document.querySelector('#main-view [data-testid="home-page"]');
      if (page) {
        homeGreeting.textContent = greetingText();
        if (homeHero.parentElement !== page) page.prepend(homeHero);
        const enter = () => {
          placeHomeSearch();
          root.classList.add("vt-home-search");
        };
        if (root.classList.contains("vt-home-search")) enter();
        else flySearch(enter);
        markShelves();
        // Spotify monta las secciones poco a poco
        [400, 1200, 3000, 6000, 12000].forEach((delay) => setTimeout(() => {
          if (token === homeToken) markShelves();
        }, delay));
        paintHomeCover();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (token !== homeToken) return;
    }
  }

  window.addEventListener("resize", placeHomeSearch, { passive: true });

  function clearHero() {
    root.classList.remove("vt-has-hero");
    hero.remove();
    heroSource = null;
  }

  // De la versión más grande a la original: no todas las portadas existen en todos los tamaños
  function heroCandidates(raw) {
    const url = imageUrl(raw);
    const large = url
      .replace("ab67616d00001e02", "ab67616d0000b273")
      .replace(/ab67706c0000(d72c|da84)/, "ab67706c0000bebb")
      .replace("mosaic.scdn.co/300/", "mosaic.scdn.co/640/");
    return large === url ? [url] : [large, url];
  }

  // Spotify pone capas oscuras distintas según la página: quita las que corten la foto
  function clearSeams() {
    const main = document.querySelector("#main-view");
    const header = main?.querySelector('[data-testid="entity-header"]');
    if (!header) return;
    const box = header.getBoundingClientRect();
    for (const y of [box.y + 90, box.bottom + 30]) {
      for (const node of document.elementsFromPoint(box.x + box.width * 0.6, y)) {
        if (!node.closest(".main-view-container") || node.closest('[role="row"], button, a')) continue;
        const style = getComputedStyle(node);
        const painted = style.backgroundImage !== "none" || style.backgroundColor !== "rgba(0, 0, 0, 0)";
        if (painted && node.getBoundingClientRect().width > box.width * 0.8) node.classList.add("vt-clear");
      }
    }
  }

  // De dónde sale la foto: la cabecera ancha del artista o la portada de la lista o el álbum
  function heroSourceNow() {
    const banner = document.querySelector('#main-view [data-testid="background-image"]');
    const url = banner?.style.backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
    if (url) return { raw: url, wide: true };
    return { raw: document.querySelector("#main-view img.main-entityHeader-image")?.getAttribute("src"), wide: false };
  }

  // Se busca la cabecera en cada cuadro: el diseño del tema entra en el mismo momento en que
  // Spotify pinta la página, sin dejar ver su diseño ni ocultar nada mientras carga
  const HERO_SEARCH_MS = 4000;
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  async function loadHeroImage(raw) {
    for (const candidate of heroCandidates(raw)) {
      const img = new Image();
      img.src = candidate;
      try {
        await img.decode();
        return img;
      } catch {}
    }
    return null;
  }

  async function syncHero() {
    const token = ++heroToken;
    const path = Spicetify.Platform.History.location.pathname;
    if (!HERO_ROUTE.test(path)) {
      clearHero();
      return;
    }
    // Espera a que la página nueva tenga su imagen, sin confundirla con la anterior
    const started = performance.now();
    while (performance.now() - started < HERO_SEARCH_MS) {
      await nextFrame();
      if (token !== heroToken) return;
      const { raw, wide } = heroSourceNow();
      const content = document.querySelector("#main-view .main-view-container__scroll-node-child");
      if (!raw || !content || (raw === heroSource && hero.parentElement === content)) continue;

      // El diseño del tema se pone en cuanto Spotify muestra la cabecera, sin esperar a la foto:
      // así la página aparece ya con su forma final y la foto entra después con un fundido
      heroSource = raw;
      heroImg.width = heroImg.height = 0;
      heroGhost.textContent = document.querySelector("#main-view h1")?.textContent ?? "";
      hero.classList.toggle("vt-hero-wide", wide);
      root.classList.add("vt-has-hero");
      // Dentro del contenido: sube exactamente con la página, sin código en cada cuadro
      content.prepend(hero);
      clearSeams();
      setTimeout(clearSeams, 500);

      // Primero la portada pequeña que Spotify ya pone en la página, que llega antes;
      // la versión grande la sustituye en cuanto termina de descargar
      const shown = wide ? null : document.querySelector("#main-view img.main-entityHeader-image");
      const quick = !shown ? null : shown.complete && shown.naturalWidth ? Promise.resolve(shown) : new Promise((resolve) => {
        shown.addEventListener("load", () => resolve(shown), { once: true });
        shown.addEventListener("error", () => resolve(null), { once: true });
      });
      const sharper = loadHeroImage(raw);
      let loaded = quick ? await Promise.race([quick, sharper]) : await sharper;
      if (!loaded) loaded = await sharper;
      if (token !== heroToken || !loaded) return;
      paintHero(loaded, wide);
      if (!calm) {
        heroImg.animate([{ opacity: 0, transform: "scale(1.09)" }, { opacity: 1, transform: "none" }], { duration: 900, easing: "cubic-bezier(.22,1,.36,1)" });
      }
      if (loaded === shown) {
        sharper.then((big) => {
          if (big && token === heroToken && big.naturalWidth > loaded.naturalWidth) paintHero(big, wide);
        });
      }
      return;
    }
    if (!heroSource) clearHero();
  }

  // Los títulos de la lista solo se oscurecen cuando quedan pegados arriba, para no cortar la foto
  let listHead = null;
  function syncListHead() {
    if (!listHead?.isConnected) {
      listHead = null;
      let node = document.querySelector('#main-view [role="row"][aria-rowindex="1"]');
      for (let i = 0; node && i < 4; node = node.parentElement, i++) {
        if (getComputedStyle(node).position === "sticky") {
          listHead = node;
          break;
        }
      }
    }
    if (!listHead) {
      root.classList.remove("vt-list-stuck");
      return;
    }
    const stickAt = parseFloat(getComputedStyle(listHead).top) || 0;
    const parentTop = listHead.parentElement.getBoundingClientRect().top;
    const stuck = parentTop < document.querySelector("#main-view").getBoundingClientRect().top + stickAt;
    listHead.classList.toggle("vt-stuck", stuck);
    // Con los títulos pegados, la barra superior va sólida: las filas no asoman entre ambos
    root.classList.toggle("vt-list-stuck", stuck);
  }

  let scrollPending = false;
  document.addEventListener("scroll", (event) => {
    if (scrollPending || !event.target?.matches?.("#main-view [data-overlayscrollbars-viewport]")) return;
    scrollPending = true;
    setTimeout(() => {
      scrollPending = false;
      syncListHead();
      if (homeHero.isConnected) markShelves();
    }, 80);
  }, { capture: true, passive: true });

  (function whenReady() {
    if (!Spicetify?.Player?.origin || !Spicetify.Player.data || !Spicetify.Platform?.History) {
      setTimeout(whenReady, 200);
      return;
    }

    // La barra lateral necesita la biblioteca en modo lista: se aplica desde el próximo arranque
    try {
      const storage = Spicetify.Platform.LocalStorageAPI;
      if (storage?.getItem("left-sidebar-state") !== 0) storage?.setItem("left-sidebar-state", 0);
    } catch {}

    const syncPlaying = () => {
      root.classList.toggle("vt-playing", Spicetify.Player.isPlaying());
      if (!calm) face.attach();
    };
    if (!calm) {
      root.classList.add("vt-has-face");
      setTimeout(face.startBlinking, 600);
    }
    Spicetify.Player.addEventListener("onplaypause", syncPlaying);
    Spicetify.Player.addEventListener("songchange", () => {
      syncPlaying();
      if (homeHero.isConnected) paintHomeCover();
      animate(".main-nowPlayingBar-left", [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ], { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" });
    });

    const syncRoute = () => {
      root.classList.toggle("vt-home", isHomeRoute());
      syncHome();
    };
    Promise.resolve(Spicetify.Platform.UserAPI?.getUser?.()).then((user) => {
      userName = user?.displayName ?? "";
      if (homeHero.isConnected) homeGreeting.textContent = greetingText();
    }).catch(() => {});
    syncRoute();

    const mainView = document.querySelector("#main-view");
    if (mainView) {
      let mainShown = mainView.getBoundingClientRect().width > 0;
      // La página vuelve deslizándose: el buscador se coloca cuando ya está quieta
      const whenSettled = (done) => {
        let last = null, still = 0, frames = 0;
        const step = () => {
          if (!mainShown) return;
          const left = mainView.getBoundingClientRect().left;
          still = left === last ? still + 1 : 0;
          last = left;
          if (still >= 5 || ++frames > 120) done();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      new ResizeObserver(([entry]) => {
        const shown = entry.contentRect.width > 0;
        if (shown === mainShown) return;
        mainShown = shown;
        if (shown) whenSettled(syncHome);
        else syncHome();
      }).observe(mainView);
    }

    // Spotify puede redibujar el inicio sin cambiar de ruta: si se lleva el saludo, se reconstruye
    // para que el buscador no se quede flotando sobre las listas
    setInterval(() => {
      if (!document.hidden && root.classList.contains("vt-home-search") && !homeHero.isConnected) syncHome();
    }, 2000);

    // Cambio de página: entra rápido y nunca retrasa la carga
    Spicetify.Platform.History.listen(() => {
      syncRoute();
      animate(".main-view-container__scroll-node", [
        { opacity: 0.35, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ], { duration: 170, easing: "ease-out" });
      syncHero();
    });

    syncPlaying();
    syncHero();
  })();
})();
