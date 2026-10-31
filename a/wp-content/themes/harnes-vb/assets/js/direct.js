// Score en direct (voir inc/direct.php) : relu toutes les 10 secondes pendant le match, comme dans l'appli.
// L'appli enregistre chaque set à sa fin : les sets reçus sont tous joués, le set en cours est le suivant.
document.querySelectorAll('[data-direct]').forEach((bloc) => {
	const { url, cle } = bloc.dataset;
	const avecProchain = bloc.dataset.prochain === '1';
	const blasons = JSON.parse(bloc.dataset.blasons || '{}');
	const apercu = /^\d{4}-\d\d-\d\d$/.test(new URLSearchParams(location.search).get('direct') || '') ? new URLSearchParams(location.search).get('direct') : '';
	const champ = (nom) => bloc.querySelector(`[data-${nom}]`);
	const colonnes = 'date,heure,adversaire,domicile,journee,competition,sets,termine,forfait';
	let minuterie;
	let enAttente = false;
	let dernier = '';

	// Date et minutes depuis minuit à Harnes (heure de Paris), aujourd'hui ou décalé d'un nombre de jours.
	const aHarnes = (jours = 0) => {
		const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
			timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
		}).formatToParts(new Date(Date.now() + jours * 864e5)).map((x) => [x.type, x.value]));
		return { date: `${p.year}-${p.month}-${p.day}`, minutes: +p.hour * 60 + +p.minute };
	};
	const minutes = (heure) => (heure ? +heure.slice(0, 2) * 60 + +heure.slice(3, 5) : 20 * 60);
	const heureCourte = (heure) => (heure ? heure.slice(0, 5).replace(/^0/, '').replace(':00', 'h').replace(':', 'h') : '');
	const jour = (date) => {
		const texte = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
		return texte.charAt(0).toUpperCase() + texte.slice(1);
	};
	const echapper = (texte) => String(texte).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
	const blason = (nom) => blasons[nom] || `<span class="blason blason--texte" aria-hidden="true">${echapper(nom.split(/[\s-]+/).slice(0, 2).map((m) => m.charAt(0).toUpperCase()).join(''))}</span>`;

	/** « direct », « termine » ou null selon le moment ; « avant » le jour du match, plus de 30 min avant le coup d'envoi. */
	const etat = (m, maintenant, hier) => {
		const joues = (m.sets || []).length;
		if (apercu) return m.termine ? 'termine' : 'direct';
		if (m.date === maintenant.date) {
			if (maintenant.minutes < minutes(m.heure) - 30) return 'avant';
			if (m.termine) return 'termine';
			// Personne n'a tenu le score : rien à montrer après la fin probable du match.
			return joues || maintenant.minutes < minutes(m.heure) + 240 ? 'direct' : null;
		}
		// Match fini après minuit : encore visible jusqu'à 2 h.
		if (m.date === hier && maintenant.minutes < 120 && joues) return m.termine ? 'termine' : 'direct';
		return null;
	};

	const afficher = (m, e) => {
		const signature = JSON.stringify([m, e]);
		if (signature === dernier) return; // Rien de neuf : pas de réécriture (lecteurs d'écran).
		dernier = signature;
		const noms = m.domicile ? ['Harnes VB', m.adversaire] : [m.adversaire, 'Harnes VB'];
		const sets = (m.sets || []).map((s) => (m.domicile ? [s.hvb, s.adversaire] : [s.adversaire, s.hvb]));
		const gagnes = [sets.filter((s) => s[0] > s[1]).length, sets.filter((s) => s[1] > s[0]).length];
		const lieu = m.domicile ? 'Salle Régionale Maréchal' : 'Extérieur';

		bloc.classList.toggle('direct--en-direct', e === 'direct');
		champ('etat').textContent = { direct: 'En direct', termine: 'Terminé', prochain: 'Prochain match' }[e];
		champ('rencontre').textContent = m.competition || `Volstar Masculine 2 · J${m.journee}`;
		noms.forEach((nom, i) => {
			const equipe = bloc.querySelector(`[data-equipe="${i}"]`);
			equipe.innerHTML = `${blason(nom)}<span>${echapper(nom)}</span>`;
			equipe.classList.toggle('est-gagnant', e !== 'termine' || gagnes[i] > gagnes[1 - i]);
		});
		champ('score').textContent = e === 'prochain' ? heureCourte(m.heure) || 'vs' : `${gagnes[0]} - ${gagnes[1]}`;

		let detail = '';
		if (m.forfait) {
			detail = `<li class="direct__mention">${(m.domicile ? gagnes[0] > gagnes[1] : gagnes[1] > gagnes[0]) ? 'Victoire' : 'Défaite'} par forfait</li>`;
		} else if (e !== 'prochain') {
			detail = sets.map(([a, b], i) => `<li><span>Set ${i + 1}</span><b class="${a > b ? 'est-gagne' : ''}">${+a}</b><i>-</i><b class="${b > a ? 'est-gagne' : ''}">${+b}</b></li>`).join('');
			if (e === 'direct') {
				const avantMatch = !sets.length && !apercu && aHarnes().minutes < minutes(m.heure);
				detail += `<li class="direct__mention">${avantMatch ? `Coup d'envoi à ${heureCourte(m.heure) || '20h'}` : `Set ${sets.length + 1} en cours`}</li>`;
			}
		}
		champ('sets').innerHTML = detail;
		champ('sets').hidden = !detail;
		champ('infos').textContent = e === 'prochain'
			? `${m.date === aHarnes().date ? "Aujourd'hui" : jour(m.date)}${m.heure ? ` · ${heureCourte(m.heure)}` : ''} · ${lieu}`
			: `${jour(m.date)} · ${lieu}`;
		bloc.hidden = false;
	};

	const planifier = (delai) => {
		clearTimeout(minuterie);
		if (delai) minuterie = setTimeout(charger, delai);
	};

	async function charger() {
		if (document.hidden) { enAttente = true; return; } // Onglet caché : on relira au retour.
		enAttente = false;
		const maintenant = aHarnes();
		const hier = aHarnes(-1).date;
		const filtre = apercu ? `date=eq.${apercu}` : `date=gte.${hier}&order=date.asc&limit=2`;
		let matchs;
		try {
			const reponse = await fetch(`${url}/rest/v1/matchs?select=${colonnes}&${filtre}`, { headers: { apikey: cle }, cache: 'no-store' });
			if (!reponse.ok) throw new Error(reponse.status);
			matchs = await reponse.json();
		} catch {
			planifier(bloc.classList.contains('direct--en-direct') ? 10e3 : 60e3); // Réseau coupé : on garde le dernier score.
			return;
		}
		for (const m of matchs) {
			const e = etat(m, maintenant, hier);
			if (e === 'direct' || e === 'termine') {
				afficher(m, e);
				planifier(e === 'direct' && !apercu ? 10e3 : 0);
				return;
			}
		}
		const aVenir = matchs.find((m) => m.date >= maintenant.date && !m.termine);
		if (avecProchain && aVenir) afficher(aVenir, 'prochain');
		else bloc.hidden = true;
		// Jour de match : on revient 30 min avant le coup d'envoi.
		if (aVenir && aVenir.date === maintenant.date) planifier(Math.max(10e3, (minutes(aVenir.heure) - 30 - maintenant.minutes) * 60e3));
		else planifier(0);
	}

	document.addEventListener('visibilitychange', () => { if (!document.hidden && enAttente) charger(); });
	charger();
});
