import React from 'react';
import homebg from '../image/homebg.png'

function Home() {

    return (
        <div>
            <div className='row mt-5 m-1'>
                <div className="card text-bg-dark">
                    <img src={homebg} className="card-img" />
                        <div className="card-img-overlay align-content-center">
                            <h3 className="card-title">Deploy Production Ready AI </h3>
                            <h3>Models Through an API or UI</h3>
                            <p>AI Infrastructure to Accelerate Your Product Development Efforts with Optimized Deployment Ops.</p>
                            <p className="card-text">We use Ezkl as an engine for doing inference for deep learning models and other computational graphs in a zk-snark (ZKML).</p>
                            <p className="card-text">Running ZKML proofs can be computationally expensive. We've made the process easier by providing a backend service that can run the proofs for you.</p>
                        </div>
                </div>
            </div>
        </div>
    )
}


export default Home