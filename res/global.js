$(document).ready(()=>{
  globalThis.SITE = {
    leftNav: $('#leftNav'),
    rightNav: $('#rightNav'),
    navBack: $('#navBack')
  };
});

function showNav(isRight){
  SITE.navBack.show();
  (isRight ? SITE.rightNav : SITE.leftNav).show();
  (isRight ? SITE.leftNav : SITE.rightNav).hide();
};

function hideNav(){
  SITE.navBack.hide();
  SITE.leftNav.hide();
  SITE.rightNav.hide();
};