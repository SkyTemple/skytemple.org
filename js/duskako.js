window.setTimeout(function() {
 var tree = document.getElementById('duskakoTree');
 var birb = document.getElementById('duskakoBirb');
 var flyingInDebug = document.getElementById('duskakoFlyingIn');
 var container = document.getElementById('duskakoContainer');

 var FLYING_IN_X = 380;
 var FLYING_IN_Y = 90;
 var PAGE_WIDTH = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

 var LANDING_IMG = "/images/duskako/intro/landingisland.gif";
 var IDLE_IMG = "/images/duskako/intro/idleisland.gif";

 var currentBirbX = 0;
 var currentBirbY = 0;
 var currentRatio = 1;

 var intervalFly = null;

 function resizeBirb() {
  currentRatio = tree.width / tree.naturalWidth;
  birb.width = birb.naturalWidth * currentRatio;
  updateBirbLocation();
 }
 resizeBirb();

 function translateX(x) {
  return x * (currentRatio);
 }

 function translateY(y) {
  return y * (currentRatio);
 }

 function updateBirbLocation() {
  _setLocation(birb, currentBirbX, currentBirbY);
 }

 function _setLocation(ele, x, y) {
  x = translateX(x);
  y = translateY(y);
  ele.style.top = "" + y + "px";
  ele.style.left = "" + x + "px";
 }

 // Initial location
 currentBirbY = FLYING_IN_Y;
 //currentBirbX = PAGE_WIDTH - container.getBoundingClientRect().left - 5;
 currentBirbX = 580;
 updateBirbLocation();

 intervalFly = setInterval(function() {
   if (currentBirbX <= FLYING_IN_X) {
    birb.style.display = "none";
    tree.src = LANDING_IMG;
    clearInterval(intervalFly);
    setTimeout(function() {
     tree.src = IDLE_IMG;
    }, 2400);
   } else {
    currentBirbX -= 1;
    if (birb.style.opacity < 1) {
     currentOpacity = isNaN(parseFloat(birb.style.opacity)) ? 0 : parseFloat(birb.style.opacity);
     birb.style.opacity = "" + (currentOpacity + 0.02);
    }
   }
   updateBirbLocation();
 }, 12);

 new ResizeObserver(resizeBirb).observe(container);
}, 100);