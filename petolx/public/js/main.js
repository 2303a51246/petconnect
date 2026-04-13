// Flash dismiss
document.querySelectorAll('.fl-msg').forEach(el=>{
  el.addEventListener('click',()=>el.remove());
  setTimeout(()=>{el.style.transition='opacity .4s';el.style.opacity='0';setTimeout(()=>el.remove(),400)},5000);
});

// Wishlist toggle
document.querySelectorAll('.wbtn').forEach(btn=>{
  btn.addEventListener('click',async e=>{
    e.stopPropagation();e.preventDefault();
    const id=btn.dataset.id;
    try{
      const r=await fetch(`/wishlist/${id}`,{method:'POST',headers:{'Content-Type':'application/json'}});
      const d=await r.json();
      if(d.success){
        btn.classList.toggle('on',d.saved);
        btn.innerHTML=d.saved?'<i class="fas fa-heart"></i>':'<i class="far fa-heart"></i>';
        toast(d.saved?'❤️ Added to Wishlist':'Removed from Wishlist');
      }else{window.location.href='/login';}
    }catch{window.location.href='/login';}
  });
});

function toast(msg,type='success'){
  let w=document.querySelector('.flash-wrap');
  if(!w){w=document.createElement('div');w.className='flash-wrap';document.body.appendChild(w);}
  const d=document.createElement('div');
  d.className=`fl-msg fl-${type}`;
  d.innerHTML=`<i class="fas fa-${type==='success'?'check-circle':'times-circle'}"></i>${msg}`;
  w.appendChild(d);
  d.addEventListener('click',()=>d.remove());
  setTimeout(()=>d.remove(),3500);
}

// Image gallery
const mainImg=document.getElementById('mainImg');
document.querySelectorAll('.thumb').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.thumb').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');
    if(mainImg)mainImg.src=t.dataset.src;
  });
});

// Post-ad image upload preview
const imgInput=document.getElementById('imgInput');
const imgGrid=document.getElementById('imgGrid');
if(imgInput&&imgGrid){
  imgInput.addEventListener('change',()=>{
    imgGrid.innerHTML='';
    Array.from(imgInput.files).slice(0,6).forEach(file=>{
      const rd=new FileReader();
      rd.onload=e=>{
        const div=document.createElement('div');div.className='img-prev';
        div.innerHTML=`<img src="${e.target.result}">`;
        imgGrid.appendChild(div);
      };
      rd.readAsDataURL(file);
    });
  });
}

// Price field toggle
const ptSel=document.getElementById('priceType');
const pField=document.getElementById('priceField');
if(ptSel&&pField){
  const tog=()=>{pField.style.display=ptSel.value==='Free'?'none':'block';};
  ptSel.addEventListener('change',tog);tog();
}

// Confirm actions
document.querySelectorAll('[data-confirm]').forEach(el=>{
  el.addEventListener('click',e=>{if(!confirm(el.dataset.confirm))e.preventDefault();});
});

// Auto scroll chat
const chatMsgs=document.getElementById('chatMsgs');
if(chatMsgs)chatMsgs.scrollTop=chatMsgs.scrollHeight;
