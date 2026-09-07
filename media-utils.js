export function isCloudinaryUrl(value){return /^https:\/\/res\.cloudinary\.com\//i.test(String(value||""))}

function looksLikeCloudinaryTransform(segment){
  const value=String(segment||"");
  return /(^|,)(?:f_|q_|c_|w_|h_|dpr_|g_|e_|ar_|fl_|r_|x_|y_|z_)/.test(value);
}

export function sourceImageUrl(value){
  const url=String(value||"").trim();
  if(!isCloudinaryUrl(url))return url;
  const marker="/upload/";
  const idx=url.indexOf(marker);
  if(idx<0)return url;
  const head=url.slice(0,idx+marker.length);
  const tail=url.slice(idx+marker.length);
  const parts=tail.split("/");
  while(parts.length&&looksLikeCloudinaryTransform(parts[0]))parts.shift();
  return head+parts.join("/");
}

export function cloudinaryDeliveryUrl(value,{width=1600,quality="auto:best",format="auto"}={}){
  const original=sourceImageUrl(value);
  if(!isCloudinaryUrl(original))return original;
  const marker="/upload/";
  const idx=original.indexOf(marker);
  if(idx<0)return original;
  const transforms=[];
  if(format)transforms.push(`f_${format}`);
  if(quality)transforms.push(`q_${quality}`);
  if(width)transforms.push(`c_limit,w_${Math.max(320,Math.min(4096,Number(width)||1600))}`);
  return original.slice(0,idx+marker.length)+transforms.join(",")+"/"+original.slice(idx+marker.length);
}

export function feedImageUrl(value){return cloudinaryDeliveryUrl(value,{width:1600,quality:"auto:best"})}
export function thumbImageUrl(value){return cloudinaryDeliveryUrl(value,{width:720,quality:"auto:good"})}
export function storyImageUrl(value){return cloudinaryDeliveryUrl(value,{width:1440,quality:"auto:best"})}
export function inspectImageUrl(value){return cloudinaryDeliveryUrl(value,{width:3200,quality:"auto:best"})}
export function originalImageUrl(value){return sourceImageUrl(value)}
