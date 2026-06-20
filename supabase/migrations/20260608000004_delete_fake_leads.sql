-- Run this to safely delete ONLY the fake demo leads, without touching the real leads your BDE is adding!
DELETE FROM public.leads 
WHERE email IN (
  'mjohnson@agriworld.com',
  'sweber@eurofoods.de',
  'ahmed@gulfspice.ae',
  'kenji@asianamarkets.jp',
  'david.s@freshproduce.co.uk'
);
