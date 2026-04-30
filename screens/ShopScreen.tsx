import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  ScrollView,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ShopCheckoutModal from '../components/ShopCheckoutModal';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

// ---------- Types ----------

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category_id: string | null;
  description: string | null;
  preorder_enabled: boolean;
  preorder_discount_percent: number | null;
}

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  product_id: string;
  product: Product;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  show_in_shop: boolean;
  display_order: number;
}

interface GroupedProduct {
  productId: string;
  name: string;
  brand: string | null;
  description: string | null;
  categoryId: string | null;
  preorderEnabled: boolean;
  preorderDiscountPercent: number | null;
  variants: ProductVariant[];
  minPrice: number;
  maxPrice: number;
  imageUrl: string | null;
  totalStock: number;
}

interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  is_preorder: boolean;
  variant: {
    id: string;
    sku: string;
    name: string;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    product: {
      name: string;
      slug: string;
      brand: string | null;
      images: string[] | null;
      preorder_discount_percent: number | null;
    };
  };
}

// ---------- Helpers ----------

function getStockStatus(
  totalStock: number,
  preorderEnabled: boolean
): 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' {
  if (totalStock > 5) return 'in_stock';
  if (totalStock > 0) return 'low_stock';
  if (preorderEnabled) return 'preorder';
  return 'out_of_stock';
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
}

// ---------- Stock Badge ----------

function StockBadge({
  status,
  preorderDiscount,
  t,
}: {
  status: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock';
  preorderDiscount?: number | null;
  t: (key: string, opts?: any) => string;
}) {
  const config = {
    in_stock: { bg: '#10B981', label: t('shop.inStock') },
    low_stock: { bg: '#F59E0B', label: t('shop.lowStock') },
    preorder: { bg: '#2A62A2', label: t('shop.preorder') },
    out_of_stock: { bg: '#94A3B8', label: t('shop.outOfStock') },
  };

  const { bg, label } = config[status];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={[styles.stockBadge, { backgroundColor: bg }]}>
        <Text style={styles.stockBadgeText}>{label}</Text>
      </View>
      {status === 'preorder' && preorderDiscount ? (
        <Text style={styles.preorderDiscountText}>
          {t('shop.preorderDiscount', { percent: preorderDiscount })}
        </Text>
      ) : null}
    </View>
  );
}

// ---------- Product Card ----------

function ProductCard({
  product,
  onPress,
  t,
}: {
  product: GroupedProduct;
  onPress: () => void;
  t: (key: string, opts?: any) => string;
}) {
  const status = getStockStatus(product.totalStock, product.preorderEnabled);
  const hasPriceRange = product.minPrice !== product.maxPrice;

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.8}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.productImagePlaceholderText}>🏓</Text>
        </View>
      )}
      <View style={styles.productCardContent}>
        <StockBadge
          status={status}
          preorderDiscount={product.preorderDiscountPercent}
          t={t}
        />
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        {product.brand ? (
          <Text style={styles.productBrand} numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}
        <Text style={styles.productPrice}>
          {hasPriceRange
            ? `${formatPrice(product.minPrice)} - ${formatPrice(product.maxPrice)}`
            : formatPrice(product.minPrice)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------- Product Detail Modal ----------

function ProductDetailModal({
  product,
  visible,
  onClose,
  onAddToCart,
  t,
}: {
  product: GroupedProduct | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart: (variant: ProductVariant, quantity: number, isPreorder: boolean) => void;
  t: (key: string, opts?: any) => string;
}) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (visible) {
      setSelectedVariantIndex(0);
      setQuantity(1);
    }
  }, [visible]);

  if (!product) return null;

  const selectedVariant = product.variants[selectedVariantIndex];
  const isPreorder =
    selectedVariant.stock_quantity <= 0 && product.preorderEnabled;
  const canAdd =
    selectedVariant.stock_quantity > 0 || product.preorderEnabled;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {/* Product Image */}
          {selectedVariant.image_url ? (
            <Image
              source={{ uri: selectedVariant.image_url }}
              style={styles.modalProductImage}
              resizeMode="cover"
            />
          ) : product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.modalProductImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.modalProductImagePlaceholder}>
              <Text style={{ fontSize: 64 }}>🏓</Text>
            </View>
          )}

          {/* Product Info */}
          <View style={styles.modalProductInfo}>
            <Text style={styles.modalProductName}>{product.name}</Text>
            {product.brand ? (
              <Text style={styles.modalProductBrand}>{product.brand}</Text>
            ) : null}
            {product.description ? (
              <Text style={styles.modalProductDescription}>{product.description}</Text>
            ) : null}

            {/* Variant Selector */}
            {product.variants.length > 1 && (
              <View style={styles.variantSection}>
                <Text style={styles.variantSectionTitle}>{t('shop.selectVariant')}</Text>
                <View style={styles.variantButtons}>
                  {product.variants.map((variant, index) => (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.variantButton,
                        index === selectedVariantIndex && styles.variantButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedVariantIndex(index);
                        setQuantity(1);
                      }}
                    >
                      <Text
                        style={[
                          styles.variantButtonText,
                          index === selectedVariantIndex && styles.variantButtonTextActive,
                        ]}
                      >
                        {variant.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Price */}
            <View style={styles.priceSection}>
              {selectedVariant.compare_at_price &&
              selectedVariant.compare_at_price > selectedVariant.price ? (
                <View style={styles.priceRow}>
                  <Text style={styles.compareAtPrice}>
                    {t('shop.compareAt')} {formatPrice(selectedVariant.compare_at_price)}
                  </Text>
                  <Text style={styles.modalPrice}>{formatPrice(selectedVariant.price)}</Text>
                </View>
              ) : (
                <Text style={styles.modalPrice}>{formatPrice(selectedVariant.price)}</Text>
              )}
              {isPreorder && product.preorderDiscountPercent ? (
                <Text style={styles.preorderNote}>
                  {t('shop.preorderDiscount', { percent: product.preorderDiscountPercent })}
                </Text>
              ) : null}
            </View>

            {/* Stock */}
            <View style={styles.stockSection}>
              <StockBadge
                status={getStockStatus(selectedVariant.stock_quantity, product.preorderEnabled)}
                preorderDiscount={product.preorderDiscountPercent}
                t={t}
              />
              {selectedVariant.stock_quantity > 0 && (
                <Text style={styles.stockQuantityText}>
                  {t('shop.quantity')}: {selectedVariant.stock_quantity}
                </Text>
              )}
            </View>

            {/* Quantity Selector */}
            {canAdd && (
              <View style={styles.quantitySection}>
                <Text style={styles.quantitySectionTitle}>{t('shop.quantity')}</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      setQuantity((q) =>
                        selectedVariant.stock_quantity > 0
                          ? Math.min(selectedVariant.stock_quantity, q + 1)
                          : q + 1
                      )
                    }
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add to Cart Button */}
        {canAdd ? (
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => onAddToCart(selectedVariant, quantity, isPreorder)}
            >
              <Text style={styles.addToCartButtonText}>{t('shop.addToCart')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.modalFooter}>
            <View style={[styles.addToCartButton, styles.addToCartButtonDisabled]}>
              <Text style={styles.addToCartButtonText}>{t('shop.outOfStock')}</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Cart Modal ----------

function CartModal({
  visible,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isLoading,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (variantId: string, newQuantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onCheckout: () => void;
  isLoading: boolean;
  t: (key: string, opts?: any) => string;
}) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.variant.price * item.quantity,
    0
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.cartTitle}>{t('shop.cart')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2A62A2" />
          </View>
        ) : cartItems.length === 0 ? (
          <View style={styles.emptyCartContainer}>
            <Text style={styles.emptyCartTitle}>{t('shop.emptyCart')}</Text>
            <Text style={styles.emptyCartText}>{t('shop.emptyCartText')}</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={cartItems}
              keyExtractor={(item) => item.variant_id}
              contentContainerStyle={styles.cartList}
              renderItem={({ item }) => (
                <View style={styles.cartItemCard}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.variant.product.name}
                    </Text>
                    <Text style={styles.cartItemVariant} numberOfLines={1}>
                      {item.variant.name}
                    </Text>
                    <Text style={styles.cartItemPrice}>{formatPrice(item.variant.price)}</Text>
                    {item.is_preorder && (
                      <Text style={styles.cartItemPreorder}>{t('shop.preorder')}</Text>
                    )}
                  </View>
                  <View style={styles.cartItemActions}>
                    <View style={styles.cartQuantityControls}>
                      <TouchableOpacity
                        style={styles.cartQuantityButton}
                        onPress={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}
                      >
                        <Text style={styles.cartQuantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.cartQuantityValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.cartQuantityButton}
                        onPress={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}
                      >
                        <Text style={styles.cartQuantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => onRemoveItem(item.variant_id)}>
                      <Text style={styles.cartRemoveText}>{t('shop.remove')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            {/* Footer */}
            <View style={styles.cartFooter}>
              <View style={styles.cartSubtotalRow}>
                <Text style={styles.cartSubtotalLabel}>{t('shop.subtotal')}</Text>
                <Text style={styles.cartSubtotalValue}>{formatPrice(subtotal)}</Text>
              </View>
              <TouchableOpacity style={styles.checkoutButton} onPress={onCheckout}>
                <Text style={styles.checkoutButtonText}>{t('shop.checkout')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Main Screen ----------

interface ShopScreenProps {
  visible?: boolean;
  onClose?: () => void;
}

export default function ShopScreen({ visible = true, onClose }: ShopScreenProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // Data
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<GroupedProduct | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  // ---------- Data fetching ----------

  const loadProducts = useCallback(async () => {
    try {
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          *,
          image_url,
          product:products (
            id,
            name,
            slug,
            brand,
            category_id,
            description,
            preorder_enabled,
            preorder_discount_percent
          )
        `)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (variantsError) {
        console.error('Error loading product variants:', variantsError);
        return;
      }

      setVariants((variantsData as any[]) || []);
    } catch (error) {
      console.error('Error in loadProducts:', error);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .eq('show_in_shop', true)
        .order('display_order', { ascending: true });

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
        return;
      }

      setCategories((categoriesData as any[]) || []);
    } catch (error) {
      console.error('Error in loadCategories:', error);
    }
  }, []);

  const loadCart = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id, variant_id, quantity, is_preorder,
          variant:product_variants (
            id, sku, name, price, compare_at_price, stock_quantity,
            product:products (name, slug, brand, images, preorder_discount_percent)
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading cart:', error);
        return;
      }

      setCartItems((data as any[]) || []);
    } catch (error) {
      console.error('Error in loadCart:', error);
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadProducts(), loadCategories(), loadCart()]);
    setIsLoading(false);
  }, [loadProducts, loadCategories, loadCart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadCategories(), loadCart()]);
    setRefreshing(false);
  }, [loadProducts, loadCategories, loadCart]);

  // ---------- Grouped products ----------

  const shopCategoryIds = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories]
  );

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, GroupedProduct>();

    for (const variant of variants) {
      if (!variant.product) continue;
      // Skip products in POS-only categories (those not in shop categories)
      if (variant.product.category_id && !shopCategoryIds.has(variant.product.category_id)) continue;
      const key = variant.product.id;

      if (!groups.has(key)) {
        groups.set(key, {
          productId: variant.product.id,
          name: variant.product.name,
          brand: variant.product.brand,
          description: variant.product.description,
          categoryId: variant.product.category_id,
          preorderEnabled: variant.product.preorder_enabled,
          preorderDiscountPercent: variant.product.preorder_discount_percent,
          variants: [],
          minPrice: variant.price,
          maxPrice: variant.price,
          imageUrl: variant.image_url || null,
          totalStock: 0,
        });
      }

      const group = groups.get(key)!;
      group.variants.push(variant);
      group.minPrice = Math.min(group.minPrice, variant.price);
      group.maxPrice = Math.max(group.maxPrice, variant.price);
      group.totalStock += variant.stock_quantity;
      if (!group.imageUrl && variant.image_url) {
        group.imageUrl = variant.image_url;
      }
    }

    return Array.from(groups.values());
  }, [variants]);

  // ---------- Filtered products ----------

  const filteredProducts = useMemo(() => {
    let result = groupedProducts;

    if (selectedCategoryId) {
      result = result.filter((p) => p.categoryId === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    return result;
  }, [groupedProducts, selectedCategoryId, searchQuery]);

  // ---------- Cart operations ----------

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const handleAddToCart = useCallback(
    async (variant: ProductVariant, quantity: number, isPreorder: boolean) => {
      if (!user?.id) {
        Alert.alert(t('common.error'), t('common.signInToRegister'));
        return;
      }

      try {
        // Check if already in cart
        const existing = cartItems.find((ci) => ci.variant_id === variant.id);
        const newQuantity = existing ? existing.quantity + quantity : quantity;

        const { error } = await supabase.from('cart_items').upsert(
          {
            user_id: user.id,
            variant_id: variant.id,
            quantity: newQuantity,
            is_preorder: isPreorder,
          },
          { onConflict: 'user_id,variant_id' }
        );

        if (error) {
          console.error('Error adding to cart:', error);
          Alert.alert(t('common.error'), t('common.somethingWrong'));
          return;
        }

        await loadCart();
        setShowProductModal(false);
      } catch (error) {
        console.error('Error in handleAddToCart:', error);
        Alert.alert(t('common.error'), t('common.somethingWrong'));
      }
    },
    [user?.id, cartItems, loadCart, t]
  );

  const handleUpdateCartQuantity = useCallback(
    async (variantId: string, newQuantity: number) => {
      if (!user?.id) return;

      if (newQuantity <= 0) {
        await handleRemoveCartItem(variantId);
        return;
      }

      try {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('user_id', user.id)
          .eq('variant_id', variantId);

        if (error) {
          console.error('Error updating cart:', error);
          return;
        }

        await loadCart();
      } catch (error) {
        console.error('Error in handleUpdateCartQuantity:', error);
      }
    },
    [user?.id, loadCart]
  );

  const handleRemoveCartItem = useCallback(
    async (variantId: string) => {
      if (!user?.id) return;

      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('variant_id', variantId);

        if (error) {
          console.error('Error removing from cart:', error);
          return;
        }

        await loadCart();
      } catch (error) {
        console.error('Error in handleRemoveCartItem:', error);
      }
    },
    [user?.id, loadCart]
  );

  const handleCheckout = useCallback(() => {
    setShowCartModal(false);
    setShowCheckoutModal(true);
  }, []);

  const handleCheckoutSuccess = useCallback((orderNumber: string) => {
    setShowCheckoutModal(false);
    // Clear cart after successful order
    loadCart();
    Alert.alert(t('common.success'), `${t('shop.orderConfirmed')} #${orderNumber}`);
  }, [loadCart, t]);

  // ---------- Render ----------

  // Build checkout cart items in the format ShopCheckoutModal expects
  const checkoutCartItems = useMemo(() => {
    return cartItems.map((item) => ({
      id: item.id,
      product_id: item.variant_id,
      product_name: item.variant.product.name,
      variant_name: item.variant.name,
      quantity: item.quantity,
      unit_price: item.variant.price,
    }));
  }, [cartItems]);

  const checkoutSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
  }, [cartItems]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A62A2" />
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.leftSection}>
              {onClose ? (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>{t('common.close')}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.pageTitle}>{t('shop.title')}</Text>
              )}
            </View>

          <View style={styles.centerSection}>
            <Image
              source={{
                uri: 'https://omqdrgqzlksexruickvh.supabase.co/storage/v1/object/public/email-images/thePickleCoLogoBlue.png',
              }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.rightSection}>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.cartButton}
                onPress={() => {
                  setShowCartModal(true);
                  loadCart();
                }}
              >
                <Text style={styles.cartButtonText}>{t('shop.viewCart')}</Text>
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <LanguageSwitcher />
            </View>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('shop.search')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterPill, !selectedCategoryId && styles.filterPillActive]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text
              style={[
                styles.filterPillText,
                !selectedCategoryId && styles.filterPillTextActive,
              ]}
            >
              {t('shop.allCategories')}
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterPill,
                selectedCategoryId === cat.id && styles.filterPillActive,
              ]}
              onPress={() =>
                setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)
              }
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedCategoryId === cat.id && styles.filterPillTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.productId}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2A62A2']}
            tintColor="#2A62A2"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('shop.noProducts')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            t={t}
            onPress={() => {
              setSelectedProduct(item);
              setShowProductModal(true);
            }}
          />
        )}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        visible={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProduct(null);
        }}
        onAddToCart={handleAddToCart}
        t={t}
      />

      {/* Cart Modal */}
      <CartModal
        visible={showCartModal}
        onClose={() => setShowCartModal(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleCheckout}
        isLoading={cartLoading}
        t={t}
      />

      {/* Checkout Modal */}
      <ShopCheckoutModal
        visible={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onSuccess={handleCheckoutSuccess}
        cartItems={checkoutCartItems}
        subtotal={checkoutSubtotal}
      />
    </SafeAreaView>
    );
  };

  // When used as a modal (has onClose prop), wrap in a Modal component
  if (onClose) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        {renderContent()}
      </Modal>
    );
  }

  // When used as a standalone screen
  return renderContent();
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 60,
    height: 28,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A62A2',
  },
  closeButton: {
    paddingVertical: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A62A2',
  },

  // Cart button in header
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A62A2',
  },
  cartBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#020817',
  },
  searchClear: {
    fontSize: 14,
    color: '#94A3B8',
    paddingLeft: 8,
  },

  // Category filters
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#2A62A2',
  },
  filterPillText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },

  // Product grid
  productList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  productCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: '#F1F5F9',
  },
  productImagePlaceholder: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImagePlaceholderText: {
    fontSize: 40,
  },
  productCardContent: {
    padding: 10,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020817',
  },
  productBrand: {
    fontSize: 12,
    color: '#64748B',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#020817',
    marginTop: 2,
  },

  // Stock badge
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  preorderDiscountText: {
    fontSize: 11,
    color: '#2A62A2',
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },

  // ---------- Product Detail Modal ----------
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCloseButton: {
    marginLeft: 'auto',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A62A2',
  },
  modalBody: {
    flex: 1,
  },
  modalProductImage: {
    width: '100%',
    height: width * 0.75,
    backgroundColor: '#F1F5F9',
  },
  modalProductImagePlaceholder: {
    width: '100%',
    height: width * 0.5,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProductInfo: {
    padding: 20,
    gap: 12,
  },
  modalProductName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#020817',
  },
  modalProductBrand: {
    fontSize: 15,
    color: '#64748B',
    marginTop: -4,
  },
  modalProductDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },

  // Variant selector
  variantSection: {
    marginTop: 4,
  },
  variantSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  variantButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  variantButtonActive: {
    borderColor: '#2A62A2',
    backgroundColor: '#EBF0F9',
  },
  variantButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  variantButtonTextActive: {
    color: '#2A62A2',
    fontWeight: '600',
  },

  // Price
  priceSection: {
    marginTop: 4,
  },
  priceRow: {
    gap: 4,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#020817',
  },
  compareAtPrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  preorderNote: {
    fontSize: 13,
    color: '#2A62A2',
    fontWeight: '500',
    marginTop: 2,
  },

  // Stock section
  stockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockQuantityText: {
    fontSize: 13,
    color: '#64748B',
  },

  // Quantity selector
  quantitySection: {
    marginTop: 4,
  },
  quantitySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#020817',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
    minWidth: 30,
    textAlign: 'center',
  },

  // Add to cart button
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  addToCartButton: {
    backgroundColor: '#2A62A2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  addToCartButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ---------- Cart Modal ----------
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
  },
  cartList: {
    padding: 20,
    gap: 12,
  },
  cartItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#020817',
  },
  cartItemVariant: {
    fontSize: 13,
    color: '#64748B',
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#020817',
  },
  cartItemPreorder: {
    fontSize: 11,
    color: '#2A62A2',
    fontWeight: '600',
  },
  cartItemActions: {
    alignItems: 'center',
    gap: 8,
  },
  cartQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartQuantityButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartQuantityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
  },
  cartQuantityValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#020817',
    minWidth: 24,
    textAlign: 'center',
  },
  cartRemoveText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },

  // Cart footer
  cartFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cartSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartSubtotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  cartSubtotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#020817',
  },
  checkoutButton: {
    backgroundColor: '#2A62A2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Empty cart
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
