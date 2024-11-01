// Check if on ChatGPT, on Wikipedia, or on Windows
let isChatGPT = location.host === "chatgpt.com";
let isWikipedia = location.host.includes("wikipedia.org");
let isWindows = /(windows)/i.test(navigator.userAgent);
const parser = new DOMParser();

// Insert appropriate CSS based on the platform and host
insertCSS('contextMenu');
insertCSS(isChatGPT ? 'chatgpt' : isWikipedia ? 'wikipedia' : '');

function insertCSS(name) {
  let link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL(`css/${name}.css`);
  document.head.appendChild(link);
}

// Event listeners and conditions for context menu on Windows only
document.addEventListener("click", removeContextMenu);
document.addEventListener("keydown", removeContextMenu);
window.addEventListener("resize", removeContextMenu);
if (!isChatGPT && !isWikipedia) document.addEventListener("scroll", removeContextMenu);

if (isWindows) {
  document.addEventListener("contextmenu", openContextMenu);
}

let contextMenu, chat, isChatLoaded, putX, putY;
window.updateChat = () => {};

// Function to open the context menu and add copy options only on Windows
function openContextMenu(event) {
  if (!isWindows) return; // Ensures only Windows users have this functionality

  removeContextMenu();
  let Element = isChatGPT 
    ? findKatexElement(event.clientX, event.clientY) 
    : isWikipedia 
    ? findMweElement(event.clientX, event.clientY) 
    : null;

  if (Element) {
    event.preventDefault();

    let contextMenuHTML = `
      <div id="contextMenu" style="left: ${event.clientX}px; top: ${event.clientY + window.scrollY}px;">
        <div id="copyMathML">Copy for Word</div>
        <div id="copyLaTeX">Copy LaTeX</div>
      </div>`;
    
    contextMenu = document.createElement('div');
    contextMenu.innerHTML = contextMenuHTML;
    document.body.appendChild(contextMenu);

    document.getElementById("copyMathML").addEventListener("click", () => {
      checkAndCopy(Element, "copyMathML");
      showCopiedMessage("Copied for Word");
    });
    document.getElementById("copyLaTeX").addEventListener("click", () => {
      checkAndCopy(Element, "copyLaTeX");
      showCopiedMessage("Copied Latex Code");
    });
  }
}

// Utility functions to handle content fetching and copying
function fetchContent(path, callback) {
  fetch(chrome.runtime.getURL(path))
    .then(response => response.text())
    .then(svgContent => callback(svgContent))
    .catch(error => console.error(`Error fetching SVG content: ${error}`));
}

function fetchSVGContent(name, callback) {
  fetchContent(`svg/${name}.svg`, callback);
}

fetchSVGContent('word', (wordSvgContent) => {
  fetchSVGContent('latex', (latexSvgContent) => {
    if (isWindows) document.addEventListener("contextmenu", openContextMenu);
  });
});

function removeContextMenu() {
  updateChat();
  contextMenu?.remove();
}

function isWithin(x, y, classNames, func) {
  let elements = [];
  classNames.forEach((e) => { elements = elements.concat([...document.getElementsByClassName(e)]) });
  for (const element of elements) {
    let rect = element.getBoundingClientRect();
    if (x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top - 1 && y <= rect.bottom + 1) {
      putX = x;
      putY = y;
      return func(element);
    }
  }
  return null;
}

// Detect math elements based on the environment
const findMweElement = (x, y) => isWithin(x, y, ["mwe-math-fallback-image-inline", "mwe-math-fallback-image-display"], (e) => e.parentElement),
      findKatexElement = (x, y) => isWithin(x, y, ["katex"], (e) => e),
      format = (string, type) => (type === "copyLaTeX" ? `$${string}$` : string);

function checkAndCopy(element, type) {
  // Ensure capturing of single math elements at a time
  let contentToCopy = checkSingleElement(element, type);
  if (contentToCopy) {
    copyToClipboard(contentToCopy);
  }
}

function showCopiedMessage(message) {
  let copiedMessage = document.createElement("div");
  copiedMessage.innerText = message;
  copiedMessage.style.position = "fixed";
  copiedMessage.style.top = "50%"; // Center vertically
  copiedMessage.style.left = "50%"; // Center horizontally
  copiedMessage.style.transform = "translate(-50%, -50%)"; // Centering adjustment
  copiedMessage.style.backgroundColor = "#4caf50";
  copiedMessage.style.color = "white";
  copiedMessage.style.padding = "15px 20px"; // Increased padding for better visibility
  copiedMessage.style.borderRadius = "5px";
  copiedMessage.style.zIndex = "9999";
  copiedMessage.style.fontSize = "16px"; // Increased font size for better readability
  copiedMessage.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.3)"; // Added shadow for better contrast

  // Adding the message to the body
  document.body.appendChild(copiedMessage);

  // Make sure the message stays for at least a second before removal
  setTimeout(() => {
    copiedMessage.remove();
  }, 2000); // Message will disappear after 2 seconds
}


function copyToClipboard(text) {
  function listener(e) {
    e.clipboardData.setData("text/plain", text.trim());
    e.preventDefault();
  }
  document.addEventListener("copy", listener);
  document.execCommand("copy");
  document.removeEventListener("copy", listener);
}

function checkSingleElement(element, type) {
  if (type === "copyMathML") {
    let mathElement = element.querySelector("math");
    if (mathElement) {
      return mathElement.outerHTML
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll(/<annotation [\S\s]*?>[\S\s]*?<\/annotation>/g, "");
    }
  }
  if (type === "copyLaTeX") {
    let latexElement = element.querySelector("annotation");
    if (latexElement) {
      let latex = latexElement.textContent;
      return latex.replace("\\displaystyle", "");
    }
  }
}



fetchSVGContent('word', (wordSvgContent) => {
  console.log('Word SVG loaded:', wordSvgContent); // Check if SVG is loaded
  fetchSVGContent('latex', (latexSvgContent) => {
    console.log('LaTeX SVG loaded:', latexSvgContent); // Check if SVG is loaded
    if (isWindows) document.addEventListener("contextmenu", openContextMenu);
  });
});