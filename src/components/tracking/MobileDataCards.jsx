import { cn } from "@/lib/utils";

/**
 * Card list for admin tables on small screens (replaces wide tables).
 */
export default function MobileDataCards({ items, renderCard, emptyMessage = "No items" }) {
  if (!items?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10 px-4 lg:hidden">{emptyMessage}</p>
    );
  }

  return (
    <ul className="lg:hidden divide-y divide-border">
      {items.map((item, index) => (
        <li key={item.id ?? index} className="p-4 active:bg-muted/50">
          {renderCard(item)}
        </li>
      ))}
    </ul>
  );
}
