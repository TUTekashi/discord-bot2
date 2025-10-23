const fs = require("fs");
const path = require("path");

const userFilePath = path.join(__dirname, "../data/userLanguages.json");

let userLangCache = {};

(function initUserCache() {
  try {
    if (!fs.existsSync(userFilePath)) {
      fs.writeFileSync(userFilePath, "{}");
      userLangCache = {};
      return;
    }
    const raw = fs.readFileSync(userFilePath, "utf8").trim();
    userLangCache = raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("Failed to load userLanguages.json, starting empty:", err);
    userLangCache = {};
  }
})();

function normalizeLang(lang) {
  if (!lang) return "";
  let l = lang.toUpperCase();
  if (l === "EN") l = "EN-US";
  if (l === "PT") l = "PT-PT";
  if (l === "ZH") l = "ZH-HANS";
  return l;
}

function getUserPref(userId) {
  const raw = userLangCache[userId];
  if (!raw) return null;
  if (typeof raw === "string") return normalizeLang(raw);
  return normalizeLang(raw.lang || raw);
}

function saveUserPref(userId, lang) {
  const normalized = normalizeLang(lang);
  userLangCache[userId] = normalized;
  try {
    fs.writeFileSync(userFilePath, JSON.stringify(userLangCache, null, 2));
  } catch (err) {
    console.error("Failed to save user language:", err);
  }
}

module.exports = { getUserPref, saveUserPref };
