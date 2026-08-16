import Masthead from "./Masthead";
import SignOff from "./SignOff";

// The chamfered white panel every page renders its content inside of —
// shared here (rather than duplicated per page) since the masthead and
// sign-off are part of the panel itself, not something pages have to
// remember to render.
export default function ContentFrame({ children }) {
  return (
    <div className="content-frame">
      <div className="content-frame-inner">
        <Masthead />
        {children}
        <SignOff />
      </div>
    </div>
  );
}
