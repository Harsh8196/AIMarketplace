import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Base from './component/Base';
import Home from './component/Home';
import Application from './component/Application';
import MyModel from './component/MyModel';
import Marketplace from './component/Marketplace';
import CreateModel from './component/CreateModel';
import BuyCredit from './component/BuyCredit';
import SwggerUI from './component/SwggerUI';
import './App.css';

function App() {
  return (
    <Router>
    <Base />
      <Routes>
      <Route path="/" element={<Home />} />
        <Route path="/application" element={<Application />} />
        <Route path="/mymodel" element={<MyModel />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/createmodel" element={<CreateModel />} />
        <Route path="/buycredit/:modelname/:uuid" element={<BuyCredit />} />
        <Route path="/swaggerui" element={<SwggerUI />} />
      </Routes>
  </Router>
  );

}

export default App;
