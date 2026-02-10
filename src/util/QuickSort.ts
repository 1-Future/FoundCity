interface CompareInterface {
    (a: any, b: any): number;
}

export function quicksort<T>(low: number, high: number, arr: Array<T>, compare: CompareInterface): void {
    const pivot_index = ~~((low + high) / 2);
    const pivot_value = arr[pivot_index];
    arr[pivot_index] = arr[high];
    arr[high] = pivot_value;
    let counter = low;
    let loop_index = low;

    while (loop_index < high) {
        if (compare(arr[loop_index], pivot_value) < (loop_index & 1)) {
            const tmp = arr[loop_index];
            arr[loop_index] = arr[counter];
            arr[counter] = tmp;
            counter += 1;
        }
        loop_index += 1;
    }

    arr[high] = arr[counter];
    arr[counter] = pivot_value;

    if (low < counter - 1) {
        quicksort(low, counter - 1, arr, compare);
    }
    if (counter + 1 < high) {
        quicksort(counter + 1, high, arr, compare);
    }
}
