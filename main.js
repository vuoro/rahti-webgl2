import { effect, state } from "@vuoro/rahti";

export const context = effect((canvas) => {
  console.log(canvas);
});
