document.addEventListener("DOMContentLoaded", () => {
	const eventDateString =
		document.body.dataset.eventDate || "2026-06-20T09:00:00+05:00";
	const supabaseUrl = document.body.dataset.supabaseUrl || "";
	const supabaseKey = document.body.dataset.supabaseKey || "";
	const eventDate = new Date(eventDateString);
	const tableName = "admission_requests";

	const countdownValues = {
		days: document.getElementById("days"),
		hours: document.getElementById("hours"),
		minutes: document.getElementById("minutes"),
		seconds: document.getElementById("seconds"),
	};

	const introOverlay = document.getElementById("introOverlay");
	const openInvitationBtn = document.getElementById("openInvitationBtn");
	const videos = Array.from(document.querySelectorAll("video"));
	const form = document.getElementById("rsvpForm");
	const message = document.getElementById("rsvpMessage");
	const clearBtn = document.getElementById("clearBtn");
	const savedCount = document.getElementById("savedCount");
	const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
	const sections = Array.from(document.querySelectorAll("main section[id]"));
	const revealItems = document.querySelectorAll("[data-reveal]");
	const saveDateButtons = document.querySelectorAll(".js-save-date");

	const supabase =
		window.supabase && supabaseUrl && supabaseKey
			? window.supabase.createClient(supabaseUrl, supabaseKey)
			: null;

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

	function updateDatabaseStatus(text, isError = false) {
		if (!savedCount) {
			return;
		}

		savedCount.textContent = text;
		savedCount.style.color = isError ? "#ffd4d4" : "";
	}

	function showMessage(text, isError = false) {
		if (!message) {
			return;
		}

		message.textContent = text;
		message.style.color = isError ? "#ffd4d4" : "";
	}

	function openInvitation() {
		document.body.classList.remove("is-locked");
		introOverlay?.classList.add("is-hidden");
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
			"Сайрам ауданы, Қарабұлақ ауылы";
		const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

		const calendarText = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//Talapker 2026//KK",
			"BEGIN:VEVENT",
			`UID:talapker-${eventDate.getTime()}@invite.local`,
			`DTSTAMP:${toIcsDate(new Date())}`,
			`DTSTART:${toIcsDate(eventDate)}`,
			`DTEND:${toIcsDate(endDate)}`,
			`SUMMARY:${escapeIcsText(
				"Д.Қонаев атындағы аграрлық техникалық колледжіне құжат қабылдау"
			)}`,
			`LOCATION:${escapeIcsText(locationText)}`,
			`DESCRIPTION:${escapeIcsText(
				"2026-2027 оқу жылына қабылдау. Құжаттар 20 маусымнан 25 тамызға дейін қабылданады."
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
		link.download = "talapker-2026.ics";
		document.body.append(link);
		link.click();
		link.remove();

		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	async function submitToSupabase(entry) {
		if (!supabase) {
			throw new Error("Supabase client is not configured.");
		}

		const { error } = await supabase.from(tableName).insert(entry);

		if (error) {
			throw error;
		}
	}

	if (form) {
		form.addEventListener("submit", async (event) => {
			event.preventDefault();

			const submitButton = form.querySelector('button[type="submit"]');
			const formData = new FormData(form);
			const entry = {
				full_name: String(formData.get("name") || "").trim(),
				phone: String(formData.get("phone") || "").trim(),
				basis: String(formData.get("basis") || "").trim(),
				specialty: String(formData.get("specialty") || "").trim(),
				source: "website",
			};

			if (submitButton) {
				submitButton.disabled = true;
			}

			showMessage("Өтініш жіберіліп жатыр...");

			try {
				await submitToSupabase(entry);
				form.reset();
				showMessage(
					`Рахмет, ${entry.full_name}! Өтініш онлайн базаға жіберілді.`
				);
				updateDatabaseStatus("Онлайн база: жазба сәтті сақталды");
			} catch (error) {
				console.error(error);
				showMessage(
					`Өтініш жіберілмеді. ${error?.message || "Supabase-та кесте мен policy орнатылғанын тексеріңіз."}`,
					true
				);
				updateDatabaseStatus("Онлайн база: қате бар", true);
			} finally {
				if (submitButton) {
					submitButton.disabled = false;
				}
			}
		});
	}

	if (clearBtn && form) {
		clearBtn.addEventListener("click", () => {
			form.reset();
			showMessage("Форма тазартылды.");
		});
	}

	if (openInvitationBtn) {
		openInvitationBtn.addEventListener("click", openInvitation, { once: true });
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

	videos.forEach((video) => {
		video.volume = 1;
		video.muted = false;
	});

	saveDateButtons.forEach((button) => {
		button.addEventListener("click", downloadCalendarInvite);
	});

	updateCountdown();
	highlightCurrentSection();
	updateDatabaseStatus(
		supabase ? "Онлайн база: дайын" : "Онлайн база: Supabase қосылмаған",
		!supabase
	);

	window.setInterval(updateCountdown, 1000);
	window.addEventListener("scroll", highlightCurrentSection, { passive: true });
});
