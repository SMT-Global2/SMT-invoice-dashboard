"use client"

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T & { cancel: () => void } {
    let timeoutId: NodeJS.Timeout | null = null;
  
    const debouncedFunc = ((...args: Parameters<T>) => {
      // Clear the previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
  
      // Set a new timeout
      timeoutId = setTimeout(() => {
        func(...args);
        timeoutId = null;
      }, wait);
    }) as T & { cancel: () => void };
  
    // Add cancel method
    debouncedFunc.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  
    return debouncedFunc;
  

}