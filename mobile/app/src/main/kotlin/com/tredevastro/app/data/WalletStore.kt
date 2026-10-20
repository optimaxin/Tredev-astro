package com.tredevastro.app.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.network.safeApiCall

object WalletStore {
    var balance by mutableStateOf<Int?>(null)

    suspend fun refresh() {
        if (!TokenStore.isSignedIn) {
            balance = null
            return
        }
        when (val result = safeApiCall { ApiClient.service.getWalletBalance() }) {
            is ApiResult.Success -> balance = result.data.balance
            is ApiResult.Failure -> { /* Retain previous value if network fails */ }
        }
    }
}
