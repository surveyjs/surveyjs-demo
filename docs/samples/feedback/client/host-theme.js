// Cadence — Customer Satisfaction Survey: Themed by the host site (client)
// https://surveyjs.io/documentation/feedback#themed-by-the-host-site

// #region sjs:feedback.host-theme.client
// While the HTML is still parsing, so the first frame is already indigo.
// Then the same write again once the page is mounted.
document.documentElement.setAttribute("data-demo-brand", "indigo");
document.documentElement.style.setProperty("--demo-brand", "oklch(0.52 0.21 275)");
// #endregion
