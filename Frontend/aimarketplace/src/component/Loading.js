import { useEffect, useState } from "react";

export function NoDeployments({isLoading,status}) {
    return (
        <div className='row loading-container' hidden={isLoading}>
            <div className="d-flex justify-content-center align-items-center flex-column">
                <span> {status}</span>
            </div>
        </div>
    )
}

export function ModelDeployments({isLoading,status}) {
    return (
        <div className='row loading-mymodel-container' hidden={isLoading}>
            <div className="d-flex justify-content-center align-items-center flex-column">
                <span> {status}</span>
            </div>
        </div>
    )
}

export function LoadingContainer({isLoading}) {
    return (
        <div className='row loading-container' hidden={isLoading}>
            <div className="d-flex justify-content-center align-items-center flex-column">
                <div className="spinner-border loading-spiner" role="status" hidden={isLoading}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    )
}