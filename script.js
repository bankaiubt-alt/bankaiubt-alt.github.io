document.addEventListener("DOMContentLoaded", () => {
	const storageKey = "nauryz-rsvp-list";
	const eventDateString =
		document.body.dataset.eventDate || "2026-03-22T09:00:00+05:00";
	const eventDate = new Date(eventDateString);

	const countdownValues = {
		days: document.getElementById("days"),
		hours: document.getElementById("hours"),
		minutes: document.getElementById("minutes"),
		seconds: document.getElementById("seconds"),
	};

	const introOverlay = document.getElementById("introOverlay");
	const openInvitationBtn = document.getElementById("openInvitationBtn");
	const inviteAudio = document.getElementById("inviteAudio");
	const audioToggleBtn = document.getElementById("audioToggleBtn");
	const form = document.getElementById("rsvpForm");
	const message = document.getElementById("rsvpMessage");
	const clearBtn = document.getElementById("clearBtn");
	const savedCount = document.getElementById("savedCount");
	const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
	const sections = Array.from(document.querySelectorAll("main section[id]"));
	const revealItems = document.querySelectorAll("[data-reveal]");
	const saveDateButtons = document.querySelectorAll(".js-save-date");

	function formatNumber(value) {
		return String(value).padStart(2, "0");
	}

	function updateCountdown() {
		const now = new Date();
		const diff = eventDate.getTime() - now.getTime();

		if (diff <= 0) {
			countdownValues.days.textContent = "00";
			countdownValues.hours.textContent = "00";
			countdownValues.minutes.textContent = "00";
			countdownValues.seconds.textContent = "00";
			return;
		}

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
		const minutes = Math.floor((diff / (1000 * 60)) % 60);
		const seconds = Math.floor((diff / 1000) % 60);

		countdownValues.days.textContent = formatNumber(days);
		countdownValues.hours.textContent = formatNumber(hours);
		countdownValues.minutes.textContent = formatNumber(minutes);
		countdownValues.seconds.textContent = formatNumber(seconds);
	}

	function getSavedEntries() {
		try {
			return JSON.parse(localStorage.getItem(storageKey) || "[]");
		} catch (error) {
			return [];
		}
	}

	function updateSavedCount() {
		const entries = getSavedEntries();
		savedCount.textContent = `Сақталған жауаптар: ${entries.length}`;
	}

	function showMessage(text) {
		message.textContent = text;
	}

	function updateAudioToggle() {
		if (!audioToggleBtn || !inviteAudio) {
			return;
		}

		const icon = audioToggleBtn.querySelector(".audio-toggle-icon");
		const text = audioToggleBtn.querySelector(".audio-toggle-text");
		const isPaused = inviteAudio.paused;

		if (icon) {
			icon.textContent = isPaused ? "▶" : "❚❚";
		}

		if (text) {
			text.textContent = isPaused ? "Ойнату" : "Пауза";
		}

		audioToggleBtn.setAttribute(
			"aria-label",
			isPaused ? "Музыканы ойнату" : "Музыканы тоқтату"
		);
	}

	function openInvitation() {
		document.body.classList.remove("is-locked");
		introOverlay?.classList.add("is-hidden");

		if (!inviteAudio) {
			return;
		}

		const playPromise = inviteAudio.play();

		if (!playPromise || typeof playPromise.catch !== "function") {
			updateAudioToggle();
			return;
		}

		playPromise.catch(() => {
			console.warn("Audio playback was blocked by the browser.");
		}).finally(() => {
			updateAudioToggle();
		});
	}

	function toggleAudio() {
		if (!inviteAudio) {
			return;
		}

		if (inviteAudio.paused) {
			const playPromise = inviteAudio.play();

			if (!playPromise || typeof playPromise.catch !== "function") {
				updateAudioToggle();
				return;
			}

			playPromise.catch(() => {
				console.warn("Audio playback was blocked by the browser.");
			}).finally(() => {
				updateAudioToggle();
			});

			return;
		}

		inviteAudio.pause();
		updateAudioToggle();
	}

	function highlightCurrentSection() {
		const offset = window.scrollY + 140;
		let activeId = sections[0]?.id || "";

		for (let index = sections.length - 1; index >= 0; index -= 1) {
			if (offset >= sections[index].offsetTop) {
				activeId = sections[index].id;
				break;
			}
		}

		navLinks.forEach((link) => {
			const isActive = link.getAttribute("href") === `#${activeId}`;
			link.classList.toggle("is-active", isActive);
		});
	}

	function escapeIcsText(text) {
		return text
			.replace(/\\/g, "\\\\")
			.replace(/;/g, "\\;")
			.replace(/,/g, "\\,")
			.replace(/\n/g, "\\n");
	}

	function toIcsDate(date) {
		return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
	}

	function downloadCalendarInvite() {
		const locationText =
			document.querySelector("[data-event-location]")?.textContent.trim() ||
			"Адресіңізді осы жерге жазыңыз";
		const endDate = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);

		const calendarText = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//Nauryz Invitation//KK",
			"BEGIN:VEVENT",
			`UID:nauryz-${eventDate.getTime()}@invite.local`,
			`DTSTAMP:${toIcsDate(new Date())}`,
			`DTSTART:${toIcsDate(eventDate)}`,
			`DTEND:${toIcsDate(endDate)}`,
			`SUMMARY:${escapeIcsText("Наурыз мерекесіне шақыру")}`,
			`LOCATION:${escapeIcsText(locationText)}`,
			`DESCRIPTION:${escapeIcsText(
				"Наурыз мерекесі. Сайттағы RSVP формасы арқылы қатысуыңызды растаңыз."
			)}`,
			"END:VEVENT",
			"END:VCALENDAR",
		].join("\r\n");

		const blob = new Blob([calendarText], {
			type: "text/calendar;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = "nauryz-invitation.ics";
		document.body.append(link);
		link.click();
		link.remove();

		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	if (form) {
		form.addEventListener("submit", (event) => {
			event.preventDefault();

			const formData = new FormData(form);
			const entry = {
				name: String(formData.get("name") || "").trim(),
				phone: String(formData.get("phone") || "").trim(),
				status: String(formData.get("status") || "attending"),
				createdAt: new Date().toISOString(),
			};

			const entries = getSavedEntries();
			entries.push(entry);
			localStorage.setItem(storageKey, JSON.stringify(entries));

			updateSavedCount();
			form.reset();

			if (entry.status === "attending") {
				showMessage(`Рахмет, ${entry.name}! Сізді қуана күтеміз.`);
				return;
			}

			if (entry.status === "maybe") {
				showMessage(`Рахмет, ${entry.name}! Нақты жауабыңызды күтеміз.`);
				return;
			}

			showMessage(`Рахмет, ${entry.name}! Жауабыңыз сақталды.`);
		});
	}

	if (clearBtn) {
		clearBtn.addEventListener("click", () => {
			form.reset();
			showMessage("Форма тазартылды.");
		});
	}

	if (openInvitationBtn) {
		openInvitationBtn.addEventListener("click", openInvitation, { once: true });
	}

	if (audioToggleBtn) {
		audioToggleBtn.addEventListener("click", toggleAudio);
	}

	if (inviteAudio) {
		inviteAudio.addEventListener("play", updateAudioToggle);
		inviteAudio.addEventListener("pause", updateAudioToggle);
	}

	if ("IntersectionObserver" in window) {
		const revealObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) {
						return;
					}

					entry.target.classList.add("is-visible");
					revealObserver.unobserve(entry.target);
				});
			},
			{
				threshold: 0.2,
			}
		);

		revealItems.forEach((item) => revealObserver.observe(item));
	} else {
		revealItems.forEach((item) => item.classList.add("is-visible"));
	}

	saveDateButtons.forEach((button) => {
		button.addEventListener("click", downloadCalendarInvite);
	});

	updateCountdown();
	updateSavedCount();
	highlightCurrentSection();
	updateAudioToggle();

	window.setInterval(updateCountdown, 1000);
	window.addEventListener("scroll", highlightCurrentSection, { passive: true });
});
