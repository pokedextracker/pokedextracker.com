import { decimal } from "../../utils/formatting";

interface Props {
  caught: number;
  total: number;
}

export function Progress({ caught, total }: Props) {
  const percent = (100 * caught) / total;

  return (
    <div className="h-28 w-full">
      <div className="relative h-full w-full border-2 border-solid border-progress bg-surface-1">
        <div className="absolute w-full p-5 text-center font-secondary text-11 font-normal tracking-1 uppercase">
          <b>{decimal(percent, 1)}%</b> done!
          <span className="max-500:hidden">
            {" "}
            (<b>{caught}</b> caught, <b>{total - caught}</b> to go)
          </span>
        </div>
        <div className="h-full bg-progress" style={{ width: `${percent}%` }} />
      </div>
      <h3
        className="mx-0 my-10 hidden font-secondary text-11 font-normal tracking-1 uppercase max-500:block"
        data-testid="progress-count"
      >
        (<b>{caught}</b> caught, <b>{total - caught}</b> to go)
      </h3>
    </div>
  );
}
