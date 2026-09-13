/**
 * DELIVERY.ID — Code.gs
 * Entry point for the web app + HTML templating helper.
 * All data functions live in Database.gs, calculations/validation in Utils.gs.
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('DELIVERY.ID — Input Pengiriman')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Allows Index.html to pull in Style.html, Form.html, Script.html
 * using <?!= include('Style'); ?> syntax.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
