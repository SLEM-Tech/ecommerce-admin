export interface Store {
  label: string;
  prefix: string;
}

export function getStores(): Store[] {
  const raw = process.env.STORES ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [label, prefix] = entry.split("|");
      return { label: label.trim(), prefix: prefix.trim() };
    });
}

export function tables(prefix: string) {
  return {
    products: `${prefix}products`,
    productImages: `${prefix}product_images`,
    productCategories: `${prefix}product_categories`,
    productAttributes: `${prefix}product_attributes`,
    categories: `${prefix}categories`,
  };
}
