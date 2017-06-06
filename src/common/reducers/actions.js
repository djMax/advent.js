function unfold(o, prefix) {
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object') {
      unfold(v, prefix ? `${prefix}.${k}` : k);
    } else {
      o[k] = prefix ? `${prefix}.${v}` : v;
    }
  }
}

export const Action = {
  Auth: {
    LoginRequested: 'Login',
    LoginCompleted: 'Login_FULFILLED',
    LoginPending: 'Login_PENDING',
    LogoutRequested: 'Logout',
    LoggedOut: 'Logout_FULFILLED',
  },
  Code: {
    CodeRequested: 'Code',
    CodeCompleted: 'Code_FULFILLED',
  },
};

unfold(Action);
