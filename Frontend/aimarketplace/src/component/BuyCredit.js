import React, { useState, useEffect } from 'react';
import '../css/BuyCredit.css'
import MetaMaskOnboarding from '@metamask/onboarding';
import { useParams } from 'react-router-dom';
import AIMarketPlace from '../script/AIMarketPlace'
import web3 from '../script/web3_'
import { LoadingContainer } from "./Loading"

const url = process.env.REACT_APP_BACKEND_URL;

function BuyCredit() {
    let { modelname,uuid } = useParams()
    const creditRate = 0.0001
    const [errorMessage, setErrorMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [accounts, setAccounts] = useState('')
    const [modelObj, setModelObj] = useState({ 'onChainReq': 0, 'offChainReq': 0, 'totalReq': 10, })
    const [isLoading, setIsLoading] = useState(true)
    const [newCredit, setNewCredit] = useState('')

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

    useEffect(() => {
        if (accounts.length > 0) {
            getModel()
        }

    }, [accounts])

    const getModel = async () => {
        setIsLoading(false);
        try {
            let response = await fetch(url + '/userbalance?model_name=' + modelname + '&address=' + accounts[0])
            let balance = await response.json()
            console.log(balance)
            setModelObj({
                'onChainReq': balance["res"]["onChainReq"],
                'offChainReq': balance["res"]["offChainReq"],
                'totalReq': balance["res"]["totalReq"],
            })

            setIsLoading(true)
        }
        catch (error) {
            console.log(error)
            setIsLoading(true)
        }
    }

    const buyCreditSubmit = async (event)=>{
        event.preventDefault()
        setLoading(false)
        try {
            setLoading(false)
            let feeWei = web3.utils.toWei(newCredit * creditRate, 'ether')
            let result = await AIMarketPlace.methods.buyCredit(uuid,newCredit)
            .send({ from: accounts[0],
                    value: feeWei
            })
            setErrorMessage('Updating userdetails in backend...')
            let response = await fetch(url+'/addusercredit',{
                    method: 'POST',
                    headers:{
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({
                        "model_name":modelname,
                        "address":accounts[0],
                        "new_credit":newCredit
                    })
                })
            result = response.json()
            setErrorMessage('Successfully bougth credit.')
            setLoading(true)
            window.location.reload()
        } catch (error) {
            console.log(error)
            setLoading(true)
            setErrorMessage(error.message)
        }
    }

    return (
        <div className='container-fluid'>
            <LoadingContainer isLoading={isLoading} />
            <div className='row d-flex justify-content-center align-items-center' hidden={!isLoading}>
                <div className='BuyCreditContainer'>
                    <div className="container card shadow rounded-2">
                        <div className="accordion accordion-flush mt-2" id="createFlush">
                            <div className="accordion-item">
                                <h2 className="accordion-header" id="create-heading">
                                    <button className='accordion-button fw-bold rounded-2' type="button" data-bs-toggle="collapse" data-bs-target="#create-collapse" aria-expanded="true" aria-controls="create-collapse">
                                        Buy Credits
                                    </button>
                                </h2>
                                <div id="create-collapse" className='accordion-collapse collapse show' aria-labelledby="create-heading" data-bs-parent="#createFlush">
                                    <div className="accordion-body">
                                        <form onSubmit={buyCreditSubmit}>
                                            <div className="mb-3 row">
                                                <label className="col-sm-2 col-form-label">Creator Address</label>
                                                <div class="col-sm-10">
                                                    <span type='text'
                                                        className="form-control" style={{ background: "#e9ecef" }}
                                                    >{accounts[0]} </span>
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Model Name</label>
                                                <div class="col-sm-10">
                                                    <input type="text" readOnly class="form-control-plaintext" value={modelname} />
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Total Credit</label>
                                                <div class="col-sm-10">
                                                    <input type="text" readOnly class="form-control-plaintext" value={modelObj["totalReq"]} />
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Available Credit</label>
                                                <div class="col-sm-10">
                                                    <input type="text" readOnly class="form-control-plaintext" value={modelObj["totalReq"] - modelObj["offChainReq"]} />
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">One Credit Rate</label>
                                                <div class="col-sm-10">
                                                    <input type="text" readOnly class="form-control-plaintext" value={creditRate + ' FRXETH'}
                                                    />
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">New Credit</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class="form-control"
                                                        value={newCredit}
                                                        onChange={(event) => setNewCredit(event.target.value)}
                                                        required />
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Total Value</label>
                                                <div class="col-sm-10">
                                                    <input type="text" readOnly class="form-control-plaintext" value={newCredit * creditRate + ' FRXETH'} />
                                                </div>
                                            </div>
                                            <span className="text-danger" hidden={!errorMessage}>{errorMessage}</span>
                                            <div className="mb-3 d-flex" style={{ alignItems: 'center' }}>
                                                <button type="submit" className="btn btn-marketplace form-control" disabled={(!loading)}>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" hidden={loading}></span>
                                                    Buy Credit</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default BuyCredit