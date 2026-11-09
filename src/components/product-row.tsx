import { Text, View } from "react-native";

import type { Product } from "@/types";

/**
 * Fila de producto para `ItemList`: la lista de productos y los de una
 * categoria. Con `hasAction` deja hueco a la derecha para el lapiz de
 * `renderAction`.
 */
export function ProductRow({
  product,
  hasAction,
}: {
  product: Product;
  hasAction: boolean;
}) {
  const categories = product.categories.map((category) => category.name);

  return (
    <View
      className={`gap-1 rounded-xl bg-element px-4 py-3 dark:bg-element-dark ${hasAction ? "pr-14" : ""}`}
    >
      <Text
        className="text-base font-semibold text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {product.name}
      </Text>
      <Text
        className="text-sm text-muted dark:text-muted-dark"
        numberOfLines={1}
      >
        {[product.serial ? `S/N ${product.serial}` : null, ...categories]
          .filter(Boolean)
          .join(" · ") || "Sin categorias"}
      </Text>
    </View>
  );
}