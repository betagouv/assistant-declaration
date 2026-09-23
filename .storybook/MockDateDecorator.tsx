import { useEffect } from 'react';
import type { Decorator } from '@storybook/react';

const RealDate = Date;

function createMockDate(fixedDate: Date): DateConstructor {
  return class MockDate extends RealDate {
    constructor(...args: any[]) {
      switch (args.length) {
        case 0:
          super(fixedDate.valueOf());
          return;
        case 1:
          super(args[0]);
          return;
        case 2:
          super(args[0], args[1]);
          return;
        case 3:
          super(args[0], args[1], args[2]);
          return;
        case 4:
          super(args[0], args[1], args[2], args[3]);
          return;
        case 5:
          super(args[0], args[1], args[2], args[3], args[4]);
          return;
        case 6:
          super(args[0], args[1], args[2], args[3], args[4], args[5]);
          return;
        default:
          super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
          return;
      }
    }

    static now() {
      return fixedDate.valueOf();
    }

    static parse = RealDate.parse;
    static UTC = RealDate.UTC;
  } as DateConstructor;
}

function MockDateProvider({ date, children }: React.PropsWithChildren<{ date: Date }>) {
  useEffect(() => {
    globalThis.Date = createMockDate(date);

    return () => {
      globalThis.Date = RealDate;
    };
  }, [date]);

  return <>{children}</>;
}

export const mockDateDecorator: Decorator = (Story, context) => {
  const storyDate = context.parameters.date;

  if (!(storyDate instanceof Date)) {
    return <Story />;
  }

  return (
    <MockDateProvider date={storyDate}>
      <Story />
    </MockDateProvider>
  );
};
