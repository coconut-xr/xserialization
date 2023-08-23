/* eslint-disable @typescript-eslint/no-explicit-any */

type OBJ = {
  object: { [key in string]: number | null } | null;
  array: Array<number> | null;
  keep: { x: number };
  array2: Array<number> | null;
  object2: { [key in string]: number | null } | null;
  filtered: Array<number>;
};

function getObj(): OBJ {
  return {
    object: {
      y: 2,
      z: null,
      x: 2,
    },
    object2: null,
    array: Array.from({ length: 100 }, (_, idx) => idx),
    array2: [],
    keep: { x: 2 },
    filtered: [1, 2, 3, 4, 5, 6],
  };
}
export function getLargeObj(): LargeObj {
  function getLargeObjPart(count: number): LargeObj {
    return count < 0
      ? Array.from({ length: 10 }, () => getObj())
      : ({
          obj1: getLargeObjPart(count - 1),
          obj2: getLargeObjPart(count - 1),
          obj3: getLargeObjPart(count - 1),
          obj4: getLargeObjPart(count - 1),
          obj5: getLargeObjPart(count - 1),
        } as any);
  }
  return getLargeObjPart(3);
}

type Length<T extends any[]> = T extends { length: infer L } ? L : never;

type BuildTuple<L extends number, T extends any[] = []> = T extends { length: L }
  ? T
  : BuildTuple<L, [...T, any]>;

type Subtract<A extends number, B extends number> = BuildTuple<A> extends [
  ...infer U,
  ...BuildTuple<B>,
]
  ? Length<U>
  : never;

type LargeObj = largeObjBuilder<6>;

type largeObjBuilder<I extends number> = {
  obj1: LargeObjInternal<I>;
  obj2: LargeObjInternal<I>;
  obj3: LargeObjInternal<I>;
  obj4: LargeObjInternal<I>;
  obj5: LargeObjInternal<I>;
};

type LargeObjInternal<I extends number> = I extends 0 ? OBJ[] : largeObjBuilder<Subtract<I, 1>>;
