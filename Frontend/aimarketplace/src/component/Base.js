import React,{useState,useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import MetaMaskOnboarding from '@metamask/onboarding';

const ONBOARD_TEXT = 'Click here to install MetaMask!';
const CONNECT_TEXT = 'Connect';
const CONNECTED_TEXT = 'Connected';


function Base() {

  const [buttonText, setButtonText] =useState(ONBOARD_TEXT);
  const [isDisabled, setDisabled] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const onboarding = useRef();
 

  useEffect(() => {
    if (!onboarding.current) {
      onboarding.current = new MetaMaskOnboarding();
    }
  }, []);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (accounts.length > 0) {
        setButtonText(CONNECTED_TEXT);
        setDisabled(true);
        onboarding.current.stopOnboarding();
      } else {
        setButtonText(CONNECT_TEXT);
        setDisabled(false);
      }
    }
  }, [accounts]);

  useEffect(() => {
    handleaccounts()
  }, []);

  const handleaccounts = async () => {
    function handleNewAccounts(newAccounts) {
        setAccounts(newAccounts);
      }
      if (MetaMaskOnboarding.isMetaMaskInstalled()) {
        await window.ethereum
          .request({ method: 'eth_requestAccounts' })
          .then(handleNewAccounts);
        await window.ethereum.on('accountsChanged', handleNewAccounts);
        return async () => {
          await window.ethereum.off('accountsChanged', handleNewAccounts);
        };
      }
  }

  const onClick = async () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      await window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then((newAccounts) => setAccounts(newAccounts));
    } else {
      onboarding.current.startOnboarding();
    }
  };
  return (
      <nav className="navbar navbar-expand-lg bg-body-tertiary sticky-top border-bottom border-secondary" >
        <div className="container-fluid">
          <Link className="navbar-brand " to="/">AI Marketplace</Link>
          <button className="navbar-toggler " type="button" data-bs-toggle="collapse" data-bs-target="#navbarToggler" aria-controls="navbarToggler" aria-expanded="false" aria-label="Toggle navigation">
            <i class="bi bi-list "></i>
          </button>
          <div className="collapse navbar-collapse" id="navbarToggler">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
                <Link className="nav-link active " aria-current="page" to='/marketplace'>Marketplace</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active " aria-current="page" to='/mymodel'>Model</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active " aria-current="page" to='/application'>Application</Link>
              </li>
            </ul>
            <button
                  className="btn btn-outline-dark mb-3 "
                  disabled={isDisabled} onClick={onClick} style={{border:'round'}}
                  >
                  {buttonText}
            </button>
          </div>
        </div>
      </nav>
  )
}

export default Base