const USER_API_URL = 'http://localhost:3002/api/user/current';

const UserContext = {
  // guaranteed ID for synchronous needs (matches backend)
  _fallbackId: 'user_123',

  async fetchUser() {
    try {
      const res = await fetch(USER_API_URL);
      const data = await res.json();
      if (data.success) {
        // MERGE LOGIC: Prioritize local name (from login page) over backend default
        const currentLocal = JSON.parse(localStorage.getItem('ascend_user') || '{}');
        const localName = currentLocal.name;

        // precise check: use local name if it exists and isn't the fallback/default placeholders
        const finalName = (localName && localName !== 'Student' && localName !== 'Kusuma')
          ? localName
          : data.user.name;

        // Create merged user object
        const mergedUser = { ...data.user, name: finalName };

        localStorage.setItem('ascend_user', JSON.stringify(mergedUser));
        return mergedUser;
      }
    } catch (e) {
      console.error("User Context Fetch Failed", e);
    }
    // Return cached or fallback if offline/error
    const cached = localStorage.getItem('ascend_user');
    return cached ? JSON.parse(cached) : { id: this._fallbackId, name: 'Student' };
  },

  getUserId() {
    const cached = localStorage.getItem('ascend_user');
    return cached ? JSON.parse(cached).id : this._fallbackId;
  },

  // Update UI elements with class 'user-name-display'
  async injectUserIdentity() {
    const user = await this.fetchUser();
    document.querySelectorAll('.user-name-display').forEach(el => {
      el.textContent = user.name;
    });
    return user;
  }
};

// Auto-run
document.addEventListener('DOMContentLoaded', () => {
  UserContext.injectUserIdentity();
});
