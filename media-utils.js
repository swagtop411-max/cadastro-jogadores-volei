export function isCloudinaryUrl(value){return /^https:\/\/res\.cloudinary\.com\//i.test(String(value||""))}

export function cloudinaryDeliveryUrl(value,{width=1600,quality="auto:best",format="auto"}={}){
  const url=String(value||"").trim();
  if(!isCloudinaryUrl(url))return url;
  const marker="/upload/";
  const idx=url.indexOf(marker);
  if(idx<0)return url;
  const transforms=[];
  if(format)transforms.push(`f_${format}`);
  if(quality)transforms.push(`q_${quality}`);
  if(width)transforms.push(`c_limit,w_${Math.max(320,Math.min(2400,Number(width)||1600))}`);
  return url.slice(0,idx+marker.length)+transforms.join(",")+"/"+url.slice(idx+marker.length);
}

export function feedImageUrl(value){return cloudinaryDeliveryUrl(value,{width:1600,quality:"auto:best"})}
export function thumbImageUrl(value){return cloudinaryDeliveryUrl(value,{width:720,quality:"auto:good"})}
export function storyImageUrl(value){return cloudinaryDeliveryUrl(value,{width:1440,quality:"auto:best"})}
