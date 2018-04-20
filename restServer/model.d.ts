import { NDArray } from './math/ndarray';
export interface Model {
    load(): Promise<void | void[]>;
    predict(input: Array<NDArray>): NDArray;
    dispose(): void;
}
