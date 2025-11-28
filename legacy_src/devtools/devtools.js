// Create a DevTools panel that loads the UI from panel/panel.html
console.log('Hello!!')
chrome.devtools.panels.create("Accessibility Minimal", "", "panel/panel.html", function(panel) {
  console.log("Accessibility Minimal panel created");
});
