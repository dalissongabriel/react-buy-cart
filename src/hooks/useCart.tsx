import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productAlreadyInCart = updatedCart.find( product => product.id === productId );

      const response = await api.get(`stock/${productId}`);
      const stock = response.data;

      const currentAmount = productAlreadyInCart ? productAlreadyInCart.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyInCart) {
        productAlreadyInCart.amount = amount;
      } else {
        const response = await api.get(`products/${productId}`);
        const productApi = response.data;
        const newProductToAdd = {
          ...productApi,
          amount
        }
        updatedCart.push(newProductToAdd);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart',JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartToUpdate = [...cart];
      const productToRemove = cartToUpdate.find( product => product.id === productId);
      if (!productToRemove) {
        throw Error();
      } 
      const updatedCart = cartToUpdate.filter( product => product.id !== productToRemove.id);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart',JSON.stringify(updatedCart));      
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cartToUpdate = [...cart];
      if (amount <= 0) return;

      const response = await api.get(`stock/${productId}`);
      const stock = response.data;

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cartToUpdate.map((product)=>{
        if(product.id === productId) {
          product.amount = amount
        }
        return product;
      });

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart',JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
