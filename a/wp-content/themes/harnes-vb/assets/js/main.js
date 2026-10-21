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

// Billetterie : le choix d'un match change la boutique Billetweb affichée.
document.querySelectorAll('[data-boutique]').forEach((bouton) => {
	bouton.addEventListener('click', () => {
		document.getElementById('boutique').src = bouton.dataset.boutique;
		document.getElementById('boutique-lien').href = bouton.dataset.lien;
		document.querySelectorAll('[data-boutique]').forEach((b) => b.setAttribute('aria-pressed', b === bouton));
	});
});

// Boutique Billetweb : le cadre prend la hauteur de son contenu (envoyée par Billetweb à chaque étape),
// pour qu'il n'y ait qu'un seul défilement, celui de la page, pendant la réservation.
(() => {
	const cadre = document.getElementById('boutique');
	if (!cadre) return;
	const boite = cadre.parentElement;
	addEventListener('message', (e) => {
		if (e.origin !== 'https://www.billetweb.fr' || typeof e.data !== 'string') return;
		const hauteur = e.data.match(/_(\d+)_https?:/);
		if (hauteur) {
			const h = Math.max(480, Number(hauteur[1]));
			if (Math.abs(cadre.offsetHeight - h) > 4) cadre.style.height = `${h}px`;
		} else if (e.data.startsWith('orderstate_')) {
			// Nouvelle étape : on revient en haut de la boutique si elle est sortie de l'écran.
			const haut = boite.getBoundingClientRect().top;
			if (haut < 0) scrollTo({ top: scrollY + haut - 100, behavior: 'smooth' });
		} else if (e.data.startsWith('fullscreen_')) {
			boite.classList.toggle('billetterie__boutique--plein-ecran', e.data.startsWith('fullscreen_on'));
		}
	});
})();

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
		'.wp-block-gallery .wp-block-image', '.hvb-epoque', '.frise', '.billet', '.atout', '.info-pratique', '.produit', '.goodie', '.tarif', '.document', '.contact-carte', '.hvb-rang', '.stand__match', '.action-cle',
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
