import { Switch, Route } from "wouter";
import { LandingPage } from "./components/LandingPage";
import { GridApp } from "./components/GridApp";

export default function App() {
  return (
    <Switch>
      <Route path="/gridding" component={GridApp} />
      <Route>
        <LandingPage onEnter={() => (window.location.href = "/gridding")} />
      </Route>
    </Switch>
  );
}
