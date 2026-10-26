// En-tête : fond plein dès qu'on a défilé, menu mobile, sous-menus au toucher.
(() => {
	const entete = document.getElementById('entete');
	const burger = document.getElementById('burger');
	const surDefilement = () => entete.classList.toggle('is-defile', window.scrollY > 40);
	surDefilement();
	window.addEventListener('scroll', surDefilement, { passive: true });

	burger.addEventListener('click', () => {
		const ouvert = document.body.classList.toggle('menu-ouvert');
		burger.setAttribute('aria-expanded', ouvert);
		burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
	});

	document.querySelectorAll('.nav .menu-item-has-children > a').forEach((lien) => {
		lien.addEventListener('click', (e) => {
			if (window.matchMedia('(max-width: 1100px)').matches) {
				e.preventDefault();
				lien.parentElement.classList.toggle('is-ouvert');
			}
		});
	});
})();

// Carrousel des actualités.
document.querySelectorAll('[data-carrousel]').forEach((carrousel) => {
	const diapos = [...carrousel.querySelectorAll('.carrousel__diapo')];
	const points = carrousel.querySelector('[data-points]');
	let actif = 0;
	let minuteur;

	const montrer = (i) => {
		actif = (i + diapos.length) % diapos.length;
		diapos.forEach((d, n) => d.classList.toggle('is-active', n === actif));
		[...points.children].forEach((p, n) => p.setAttribute('aria-current', n === actif));
		clearInterval(minuteur);
		minuteur = setInterval(() => montrer(actif + 1), 7000);
	};

	diapos.forEach((_, n) => {
		const point = document.createElement('button');
		point.setAttribute('aria-label', `Actualité ${n + 1}`);
		point.addEventListener('click', () => montrer(n));
		points.append(point);
	});
	carrousel.querySelector('[data-prec]').addEventListener('click', () => montrer(actif - 1));
	carrousel.querySelector('[data-suiv]').addEventListener('click', () => montrer(actif + 1));
	if (diapos.length < 2) carrousel.classList.add('is-seul');
	montrer(0);
});

// Compte à rebours jusqu'au prochain match.
document.querySelectorAll('[data-compte]').forEach((compte) => {
	const cible = new Date(compte.dataset.compte).getTime();
	const champs = ['j', 'h', 'm', 's'].map((c) => compte.querySelector(`[data-${c}]`));
	const deux = (n) => String(n).padStart(2, '0');
	const maj = () => {
		const reste = Math.max(0, Math.floor((cible - Date.now()) / 1000));
		const valeurs = [Math.floor(reste / 86400), Math.floor(reste / 3600) % 24, Math.floor(reste / 60) % 60, reste % 60];
		champs.forEach((champ, i) => { champ.textContent = deux(valeurs[i]); });
	};
	maj();
	setInterval(maj, 1000);
});

// Billetterie : « Voir les offres » déplie les tarifs du match sous le billet.
document.querySelectorAll('.billetterie-hvb .bh-billet__offres-lien').forEach((b) => b.addEventListener('click', () => {
	const ouvert = b.getAttribute('aria-expanded') === 'true';
	document.getElementById(b.getAttribute('aria-controls')).hidden = ouvert;
	b.setAttribute('aria-expanded', String(!ouvert));
	b.textContent = ouvert ? 'Voir les offres' : 'Masquer les offres';
}));

// Visionneuse : les photos des galeries s'ouvrent en grand, avec navigation.
(() => {
	const liens = [...document.querySelectorAll('.wp-block-gallery a[href], .contenu .wp-block-image > a[href]')]
		.filter((a) => /\.(jpe?g|png|webp)(\?|$)/i.test(a.href));
	if (!liens.length) return;
	const v = document.createElement('div');
	v.className = 'visionneuse';
	v.hidden = true;
	v.setAttribute('role', 'dialog');
	v.setAttribute('aria-label', 'Photo agrandie');
	v.innerHTML = '<img alt=""><button class="visionneuse__fermer" aria-label="Fermer">×</button>'
		+ '<button class="visionneuse__prec" aria-label="Photo précédente"><svg class="icone" viewBox="0 0 24 24"><path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg></button>'
		+ '<button class="visionneuse__suiv" aria-label="Photo suivante"><svg class="icone" viewBox="0 0 24 24"><path d="M8.6 7.4L10 6l6 6-6 6-1.4-1.4 4.6-4.6z"/></svg></button>';
	document.body.append(v);
	const img = v.querySelector('img');
	let courant = 0;
	const montrer = (i) => {
		courant = (i + liens.length) % liens.length;
		img.src = liens[courant].href;
		img.alt = liens[courant].querySelector('img')?.alt || '';
	};
	const fermer = () => { v.hidden = true; document.body.style.overflow = ''; liens[courant].focus(); };
	liens.forEach((a, i) => a.addEventListener('click', (e) => {
		e.preventDefault();
		montrer(i);
		v.hidden = false;
		document.body.style.overflow = 'hidden';
		v.querySelector('.visionneuse__fermer').focus();
	}));
	v.querySelector('.visionneuse__fermer').addEventListener('click', fermer);
	v.querySelector('.visionneuse__prec').addEventListener('click', () => montrer(courant - 1));
	v.querySelector('.visionneuse__suiv').addEventListener('click', () => montrer(courant + 1));
	v.addEventListener('click', (e) => { if (e.target === v) fermer(); });
	document.addEventListener('keydown', (e) => {
		if (v.hidden) return;
		if (e.key === 'Escape') fermer();
		if (e.key === 'ArrowLeft') montrer(courant - 1);
		if (e.key === 'ArrowRight') montrer(courant + 1);
	});
})();

// Frise de l'histoire : chaque année est placée à la hauteur de son paragraphe,
// une ligne rouge suit la lecture et l'année en cours est mise en avant.
(() => {
	const frise = document.querySelector('.frise');
	if (!frise) return;
	const colonne = frise.closest('.wp-block-column');
	const items = [...frise.querySelectorAll('li')];
	const cibles = items.map((li) => document.getElementById(li.querySelector('a').hash.slice(1)));
	const progression = document.createElement('span');
	progression.className = 'frise__progression';
	frise.querySelector('ol').prepend(progression);
	const repere = document.createElement('span');
	repere.className = 'frise__repere';
	repere.setAttribute('aria-hidden', 'true');
	frise.querySelector('ol').append(repere);
	const bureau = window.matchMedia('(min-width: 861px)');
	const haut = (el) => el.getBoundingClientRect().top + window.scrollY;

	const placer = () => {
		frise.classList.toggle('is-positionnee', bureau.matches);
		if (!bureau.matches) {
			items.forEach((li) => { li.style.top = ''; });
			suivre();
			return;
		}
		const origine = haut(colonne);
		let minimum = 0;
		items.forEach((li, i) => {
			const y = Math.max(cibles[i] ? haut(cibles[i]) - origine : minimum, minimum);
			li.style.top = `${y}px`;
			minimum = y + li.offsetHeight + 10;
		});
		suivre();
	};

	let courant = -1;
	const suivre = () => {
		const lecture = window.scrollY + window.innerHeight * 0.35;
		let actif = 0;
		cibles.forEach((c, i) => { if (c && haut(c) <= lecture) actif = i; });
		items.forEach((li, i) => {
			li.classList.toggle('is-passe', i < actif);
			li.classList.toggle('is-courant', i === actif);
		});
		if (bureau.matches) {
			const max = colonne.offsetHeight;
			const y = Math.min(Math.max(lecture - haut(colonne), 0), max);
			progression.style.height = `${y}px`;
			repere.style.top = `${y}px`;
			repere.textContent = items[actif].querySelector('.frise__annee').textContent;
		} else if (actif !== courant) {
			items[actif].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
		}
		courant = actif;
	};

	frise.querySelectorAll('a').forEach((lien, i) => lien.addEventListener('click', () => {
		if (cibles[i]?.tagName === 'DETAILS') cibles[i].open = true;
	}));
	// Ouvrir ou fermer une époque change la hauteur du texte : on replace la frise.
	document.querySelectorAll('.hvb-histoire details').forEach((d) => d.addEventListener('toggle', placer));
	window.addEventListener('scroll', suivre, { passive: true });
	window.addEventListener('resize', placer);
	window.addEventListener('load', placer);
	placer();
})();

// Apparition au défilement : les blocs glissent en douceur quand ils entrent à l'écran,
// les éléments d'une même grille apparaissent en cascade.
(() => {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
	const selecteurs = [
		'.contenu > *', '.bloc__inner > *', '.bloc__grille > *', '.contenu .wp-block-column', '.contenu .hvb-genese .wp-block-column',
		'.raison', '.pack', '.partenaire', '.tarifs', '.options__sur-mesure', '.mur-logos__logo', '.contact', '.hvb-chiffres .chiffre',
		'.hvb-salle', '.hvb-card', '.joueur', '.carte-actu', '.label', '.couleur', '.pastille-chiffre', '.suivez__lien',
		'.ligne-match', '.titre-section', '.section-entete', '.carte', '.devise__texte > *', '.mosaique__photo',
		'.wp-block-gallery .wp-block-image', '.hvb-epoque', '.frise', '.billet', '.atout', '.info-pratique', '.produit', '.goodie', '.tarif', '.document', '.contact-carte', '.hvb-rang', '.resultat', '.stand__match', '.action-cle',
	].join(',');
	const elements = [...document.querySelectorAll(selecteurs)].filter((el) => !el.closest('.entete, .pied, .visionneuse, .carrousel'));
	const parents = new Map();
	elements.forEach((el) => {
		el.classList.add('revele');
		// Décalage en cascade selon le rang dans son parent.
		const rang = parents.get(el.parentElement) || 0;
		parents.set(el.parentElement, rang + 1);
		el.style.setProperty('--delai', `${Math.min(rang, 8) * 70}ms`);
	});
	const obs = new IntersectionObserver((entrees) => {
		entrees.forEach((e) => {
			if (e.isIntersecting) {
				e.target.classList.add('est-visible');
				obs.unobserve(e.target);
			}
		});
	}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
	elements.forEach((el) => obs.observe(el));
})();

// Compteurs : les chiffres défilent jusqu'à leur valeur quand ils apparaissent.
(() => {
	const cibles = document.querySelectorAll('.hvb-chiffres strong, .pastille-chiffre strong, [data-compteur]');
	if (!cibles.length || !('IntersectionObserver' in window)) return;
	const animer = (el) => {
		const texte = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : null;
		if (!texte) return;
		const brut = texte.textContent.trim();
		const m = brut.match(/^(\d[\d\s ]*\d|\d)(,\d+)?(.*)$/);
		if (!m) return;
		const fin = parseInt(m[1].replace(/\D/g, ''), 10);
		const decimales = m[2] || '';
		const suite = m[3] || '';
		const espaces = /[\s ]/.test(m[1]);
		const format = (n) => (espaces ? n.toLocaleString('fr-FR').replace(/ /g, ' ') : String(n));
		const duree = 1400;
		const debut = performance.now();
		const pas = (t) => {
			const p = Math.min((t - debut) / duree, 1);
			const v = Math.round(fin * (1 - Math.pow(1 - p, 3)));
			texte.textContent = format(v) + (p === 1 ? decimales : '') + suite;
			if (p < 1) requestAnimationFrame(pas);
		};
		requestAnimationFrame(pas);
	};
	const obs = new IntersectionObserver((entrees) => entrees.forEach((e) => {
		if (e.isIntersecting) { animer(e.target); obs.unobserve(e.target); }
	}), { threshold: 0.4 });
	cibles.forEach((c) => obs.observe(c));
})();

// Boutons « Copier » : copient une adresse e-mail (utile sans application de messagerie configurée).
document.querySelectorAll('[data-copier]').forEach((bouton) => {
	bouton.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText(bouton.dataset.copier);
		} catch (e) {
			const champ = Object.assign(document.createElement('textarea'), { value: bouton.dataset.copier });
			document.body.append(champ);
			champ.select();
			document.execCommand('copy');
			champ.remove();
		}
		bouton.textContent = 'Copié !';
		bouton.classList.add('est-copie');
		setTimeout(() => { bouton.textContent = 'Copier'; bouton.classList.remove('est-copie'); }, 2000);
	});
});

// Liens e-mail : si aucune application de messagerie ne s'ouvre (fréquent sur ordinateur avec Gmail
// dans le navigateur), une fenêtre propose d'écrire depuis Gmail ou Outlook, avec destinataire,
// objet et message déjà remplis.
(() => {
	const fenetre = document.createElement('dialog');
	fenetre.className = 'choix-mail';
	fenetre.innerHTML = `
		<p class="choix-mail__titre">Envoyer le message avec…</p>
		<p class="choix-mail__texte">Le destinataire et le message sont déjà remplis : il ne reste qu'à envoyer.</p>
		<div class="choix-mail__boutons">
			<a class="bouton bouton--rouge" href="https://mail.google.com/" data-service="gmail" target="_blank" rel="noopener">Gmail</a>
			<a class="bouton bouton--noir" href="https://outlook.live.com/" data-service="outlook" target="_blank" rel="noopener">Outlook</a>
			<button type="button" class="bouton choix-mail__copier" data-service="copier">Copier le message</button>
		</div>
		<button type="button" class="choix-mail__fermer" aria-label="Fermer">×</button>`;
	document.body.append(fenetre);
	fenetre.querySelector('.choix-mail__fermer').addEventListener('click', () => fenetre.close());
	fenetre.addEventListener('click', (e) => { if (e.target === fenetre) fenetre.close(); });

	const ouvrir = (lien) => {
		const url = new URL(lien.href);
		const a = decodeURIComponent(url.pathname);
		const objet = url.searchParams.get('subject') || '';
		const corps = url.searchParams.get('body') || '';
		const enc = encodeURIComponent;
		fenetre.querySelector('[data-service="gmail"]').href = `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(a)}&su=${enc(objet)}&body=${enc(corps)}`;
		fenetre.querySelector('[data-service="outlook"]').href = `https://outlook.live.com/mail/0/deeplink/compose?to=${enc(a)}&subject=${enc(objet)}&body=${enc(corps)}`;
		const copier = fenetre.querySelector('[data-service="copier"]');
		copier.textContent = 'Copier le message';
		copier.onclick = async () => {
			try { await navigator.clipboard.writeText(`À : ${a}\nObjet : ${objet}\n\n${corps}`); copier.textContent = 'Message copié !'; } catch (err) { copier.textContent = a; }
		};
		fenetre.showModal();
	};

	document.querySelectorAll('a[href^="mailto:"]').forEach((lien) => {
		lien.addEventListener('click', () => {
			// Si une messagerie s'ouvre, la page perd le focus : on ne propose rien de plus.
			let quittee = false;
			const surQuitte = () => { quittee = true; };
			window.addEventListener('blur', surQuitte, { once: true });
			document.addEventListener('visibilitychange', surQuitte, { once: true });
			setTimeout(() => {
				window.removeEventListener('blur', surQuitte);
				document.removeEventListener('visibilitychange', surQuitte);
				if (!quittee && document.hasFocus()) ouvrir(lien);
			}, 900);
		});
	});
})();

// Cartes Google Maps : chargées seulement quand le visiteur clique sur « Afficher la carte ».
document.querySelectorAll('.carte-differee').forEach((bloc) => {
	bloc.querySelector('.carte-differee__bouton').addEventListener('click', () => {
		const carte = Object.assign(document.createElement('iframe'), { className: 'hvb-map', src: bloc.dataset.src, title: bloc.dataset.titre });
		carte.setAttribute('loading', 'lazy');
		bloc.replaceWith(carte);
	});
});

// Annonce du prochain match à domicile : la fenêtre s'ouvre une fois par visite (onglet), pas à chaque page.
(() => {
	const fenetre = document.querySelector('.annonce-match');
	if (!fenetre || typeof fenetre.showModal !== 'function') return;
	let deja = null;
	try { deja = sessionStorage.getItem('hvb-annonce'); } catch (e) { /* stockage indisponible : on affiche */ }
	if (deja === fenetre.dataset.annonce) return;
	const fermer = () => fenetre.close();
	fenetre.querySelector('.annonce-match__fermer').addEventListener('click', fermer);
	fenetre.querySelector('.annonce-match__plus-tard').addEventListener('click', fermer);
	fenetre.addEventListener('click', (e) => { if (e.target === fenetre) fermer(); });
	setTimeout(() => {
		if (document.querySelector('dialog[open]')) return;
		fenetre.showModal();
		try { sessionStorage.setItem('hvb-annonce', fenetre.dataset.annonce); } catch (e) { /* rien */ }
	}, 1200);
})();

// Accueil : carrousel « à la une ». Défile toutes les 7 s (pas si l'animation est réduite), s'arrête au survol
// et au clavier ; flèches, points, touches gauche/droite et balayage sur téléphone.
(() => {
	const bloc = document.querySelector('[data-carrousel-une]');
	if (!bloc) return;
	const diapos = [...bloc.querySelectorAll('.acc-diapo')];
	const points = [...bloc.querySelectorAll('[data-diapo]')];
	if (diapos.length < 2) return;
	const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let actif = 0;
	let minuterie;
	let pause = false;
	const montrer = (n) => {
		actif = (n + diapos.length) % diapos.length;
		diapos.forEach((d, i) => {
			const visible = i === actif;
			d.classList.toggle('is-active', visible);
			d.toggleAttribute('inert', !visible);
			d.setAttribute('aria-hidden', String(!visible));
			if (visible) d.querySelector('img').loading = 'eager';
		});
		points.forEach((p, i) => p.toggleAttribute('aria-current', i === actif));
	};
	const lancer = () => {
		clearInterval(minuterie);
		if (!reduit && !pause && !document.hidden) minuterie = setInterval(() => montrer(actif + 1), 7000);
	};
	const aller = (n) => { montrer(n); lancer(); };
	bloc.querySelector('[data-une-prec]').addEventListener('click', () => aller(actif - 1));
	bloc.querySelector('[data-une-suiv]').addEventListener('click', () => aller(actif + 1));
	points.forEach((p, i) => p.addEventListener('click', () => aller(i)));
	bloc.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') aller(actif - 1);
		else if (e.key === 'ArrowRight') aller(actif + 1);
	});
	const arreter = () => { pause = true; clearInterval(minuterie); };
	const reprendre = () => { pause = false; lancer(); };
	bloc.addEventListener('mouseenter', arreter);
	bloc.addEventListener('mouseleave', reprendre);
	bloc.addEventListener('focusin', arreter);
	bloc.addEventListener('focusout', (e) => { if (!bloc.contains(e.relatedTarget)) reprendre(); });
	// Balayage horizontal sur écran tactile.
	let depart = null;
	bloc.addEventListener('touchstart', (e) => { depart = e.touches[0]; }, { passive: true });
	bloc.addEventListener('touchend', (e) => {
		if (!depart) return;
		const dx = e.changedTouches[0].clientX - depart.clientX;
		const dy = e.changedTouches[0].clientY - depart.clientY;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) aller(actif + (dx < 0 ? 1 : -1));
		depart = null;
	});
	document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(minuterie) : lancer()));
	lancer();
})();
