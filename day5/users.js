// ---------- Select elements ----------
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const API_URL = "https://jsonplaceholder.typicode.com/users";

// All users loaded from the API (the filter works on this array)
let allUsers = [];

// ---------- Draw any array of users ----------
function renderUsers(list) {
  usersList.replaceChildren();

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users match your filter.";
    usersList.appendChild(empty);
    return;
  }

  list.forEach(function (user) {
    const item = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("div");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("div");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("div");
    company.textContent = `Company: ${user.company.name}`;

    item.append(name, email, city, company);
    usersList.appendChild(item);
  });
}

// ---------- Fetch users ----------
async function loadUsers() {
  loadButton.disabled = true;
  statusText.textContent = "Loading users...";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    allUsers = await response.json();
    filterInput.value = "";
    renderUsers(allUsers);
    statusText.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    statusText.textContent = `Error: ${error.message}`;
  } finally {
    loadButton.disabled = false;
  }
}

// ---------- Filter (no new request) ----------
function filterUsers() {
  if (allUsers.length === 0) {
    statusText.textContent = "Load the users first.";
    return;
  }

  const term = filterInput.value.trim().toLowerCase();
  const matches = allUsers.filter(function (user) {
    return user.name.toLowerCase().includes(term);
  });

  renderUsers(matches);

  if (matches.length === 0) {
    statusText.textContent = "No users match your filter.";
  } else {
    statusText.textContent = `Showing ${matches.length} of ${allUsers.length} users.`;
  }
}

// ---------- Events ----------
loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", filterUsers);
