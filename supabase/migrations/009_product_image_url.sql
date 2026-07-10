-- Product catalog images (hosted via ImgBB or any HTTPS URL)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN products.image_url IS 'Public HTTPS URL for product photo (e.g. ImgBB display_url)';
