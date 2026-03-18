document.addEventListener("DOMContentLoaded", async () => {
	const supabaseUrl = document.body.dataset.supabaseUrl || "";
	const supabaseKey = document.body.dataset.supabaseKey || "";
	const tableName = "admission_requests";

	const authScreen = document.getElementById("authScreen");
	const dashboard = document.getElementById("dashboard");
	const loginForm = document.getElementById("loginForm");
	const authMessage = document.getElementById("authMessage");
	const refreshBtn = document.getElementById("refreshBtn");
	const logoutBtn = document.getElementById("logoutBtn");
	const searchInput = document.getElementById("searchInput");
	const requestsBody = document.getElementById("requestsBody");
	const tableStatus = document.getElementById("tableStatus");
	const totalCount = document.getElementById("totalCount");
	const basisNineCount = document.getElementById("basisNineCount");
	const basisElevenCount = document.getElementById("basisElevenCount");

	let allRequests = [];
	let refreshTimer = null;

	const supabase =
		window.supabase && supabaseUrl && supabaseKey
			? window.supabase.createClient(supabaseUrl, supabaseKey)
			: null;

	function getFriendlyAuthError(error) {
		const message = String(error?.message || error || "");

		if (message.toLowerCase().includes("email not confirmed")) {
			return "Email әлі расталмаған. Supabase ішінде user-ды confirm етіңіз.";
		}

		if (message.toLowerCase().includes("invalid login credentials")) {
			return "Email немесе пароль қате.";
		}

		if (message.toLowerCase().includes("fetch")) {
			return "Желі қатесі. Админканы file:// емес, localhost арқылы ашып көріңіз.";
		}

		return `Кіру қатесі: ${message}`;
	}

	function setAuthMessage(text, type = "") {
		authMessage.textContent = text;
		authMessage.className = "status-message";
		if (type) {
			authMessage.classList.add(type);
		}
	}

	function setTableStatus(text, type = "") {
		tableStatus.textContent = text;
		tableStatus.className = "";
		if (type) {
			tableStatus.classList.add(type);
		}
	}

	function formatDate(value) {
		if (!value) {
			return "—";
		}

		return new Date(value).toLocaleString("ru-RU", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function escapeHtml(value) {
		return String(value)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&#039;");
	}

	function renderSummary(rows) {
		totalCount.textContent = String(rows.length);
		basisNineCount.textContent = String(
			rows.filter((row) => row.basis === "9-сынып").length
		);
		basisElevenCount.textContent = String(
			rows.filter((row) => row.basis === "11-сынып").length
		);
	}

	function renderRows(rows) {
		if (!rows.length) {
			requestsBody.innerHTML =
				'<tr><td colspan="7" class="empty-state">Заявок не найдено</td></tr>';
			renderSummary(rows);
			return;
		}

		requestsBody.innerHTML = rows
			.map(
				(row) => `
					<tr>
						<td>${escapeHtml(row.full_name || "—")}</td>
						<td>${escapeHtml(row.phone || "—")}</td>
						<td>${escapeHtml(row.basis || "—")}</td>
						<td>${escapeHtml(row.specialty || "—")}</td>
						<td>${escapeHtml(row.source || "—")}</td>
						<td>${escapeHtml(formatDate(row.created_at))}</td>
						<td>
							<button
								class="button button-danger table-action"
								type="button"
								data-delete-id="${escapeHtml(row.id || "")}"
							>
								Удалить
							</button>
						</td>
					</tr>
				`
			)
			.join("");

		renderSummary(rows);
	}

	function applySearch() {
		const query = (searchInput.value || "").trim().toLowerCase();

		if (!query) {
			renderRows(allRequests);
			setTableStatus(`Показано заявок: ${allRequests.length}`, "status-success");
			return;
		}

		const filtered = allRequests.filter((row) => {
			const haystack = [
				row.full_name,
				row.phone,
				row.basis,
				row.specialty,
				row.source,
			]
				.join(" ")
				.toLowerCase();

			return haystack.includes(query);
		});

		renderRows(filtered);
		setTableStatus(`Найдено заявок: ${filtered.length}`, "status-success");
	}

	async function loadRequests() {
		if (!supabase) {
			setTableStatus("Supabase не подключен", "status-error");
			return;
		}

		setTableStatus("Загрузка заявок...");

		const { data, error } = await supabase
			.from(tableName)
			.select("id, full_name, phone, basis, specialty, source, created_at")
			.order("created_at", { ascending: false });

		if (error) {
			console.error(error);
			setTableStatus(
				`Не удалось загрузить заявки: ${error.message}`,
				"status-error"
			);
			requestsBody.innerHTML =
				'<tr><td colspan="7" class="empty-state">Ошибка загрузки</td></tr>';
			return;
		}

		allRequests = data || [];
		applySearch();
		if (!searchInput.value.trim()) {
			setTableStatus(`Показано заявок: ${allRequests.length}`, "status-success");
		}
	}

	function startAutoRefresh() {
		if (refreshTimer) {
			clearInterval(refreshTimer);
		}

		refreshTimer = window.setInterval(() => {
			if (!dashboard.classList.contains("hidden")) {
				loadRequests().catch((error) => {
					console.error(error);
				});
			}
		}, 8000);
	}

	function stopAutoRefresh() {
		if (!refreshTimer) {
			return;
		}

		clearInterval(refreshTimer);
		refreshTimer = null;
	}

	async function deleteRequest(id) {
		if (!supabase) {
			setTableStatus("Supabase не подключен", "status-error");
			return;
		}

		const confirmed = window.confirm("Удалить эту заявку?");
		if (!confirmed) {
			return;
		}

		setTableStatus("Удаление заявки...");

		const { error } = await supabase.from(tableName).delete().eq("id", id);

		if (error) {
			console.error(error);
			setTableStatus(`Не удалось удалить заявку: ${error.message}`, "status-error");
			window.alert(`Не удалось удалить заявку: ${error.message}`);
			return;
		}

		setTableStatus("Заявка удалена", "status-success");
		await loadRequests();
	}

	function showDashboard() {
		authScreen.classList.add("hidden");
		dashboard.classList.remove("hidden");
		startAutoRefresh();
	}

	function showLogin() {
		dashboard.classList.add("hidden");
		authScreen.classList.remove("hidden");
		stopAutoRefresh();
	}

	async function restoreSession() {
		if (!supabase) {
			setAuthMessage("Supabase не подключен", "status-error");
			return;
		}

		const {
			data: { session },
			error,
		} = await supabase.auth.getSession();

		if (error) {
			console.error(error);
			setAuthMessage("Не удалось получить сессию", "status-error");
			return;
		}

		if (session) {
			showDashboard();
			await loadRequests();
			return;
		}

		showLogin();
	}

	if (!supabase) {
		setAuthMessage("Supabase client не инициализирован", "status-error");
		return;
	}

	if (window.location.protocol === "file:") {
		setAuthMessage(
			"Бұл бетті file:// арқылы емес, localhost арқылы ашқан дұрыс. Мысалы, VS Code Live Server қолданыңыз.",
			"status-error"
		);
	}

	loginForm.addEventListener("submit", async (event) => {
		event.preventDefault();

		const formData = new FormData(loginForm);
		const email = String(formData.get("email") || "").trim();
		const password = String(formData.get("password") || "");

		setAuthMessage("Вход выполняется...");

		try {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				console.error(error);
				setAuthMessage(getFriendlyAuthError(error), "status-error");
				return;
			}

			setAuthMessage("Вход выполнен", "status-success");
			showDashboard();
			await loadRequests();
		} catch (error) {
			console.error(error);
			setAuthMessage(getFriendlyAuthError(error), "status-error");
		}
	});

	refreshBtn.addEventListener("click", async () => {
		await loadRequests();
	});

	logoutBtn.addEventListener("click", async () => {
		await supabase.auth.signOut();
		allRequests = [];
		searchInput.value = "";
		renderRows([]);
		setTableStatus("Вы вышли из аккаунта");
		showLogin();
		setAuthMessage("Войдите, чтобы видеть заявки");
	});

	searchInput.addEventListener("input", applySearch);

	requestsBody.addEventListener("click", async (event) => {
		const button = event.target.closest("[data-delete-id]");
		if (!button) {
			return;
		}

		const id = button.getAttribute("data-delete-id");
		if (!id) {
			return;
		}

		await deleteRequest(id);
	});

	supabase.auth.onAuthStateChange((event, session) => {
		if (event === "SIGNED_OUT" || !session) {
			showLogin();
			return;
		}

		if (event === "SIGNED_IN") {
			showDashboard();
			window.setTimeout(() => {
				loadRequests().catch((error) => {
					console.error(error);
					setTableStatus("Не удалось загрузить заявки после входа.", "status-error");
				});
			}, 0);
		}
	});

	await restoreSession();
});
