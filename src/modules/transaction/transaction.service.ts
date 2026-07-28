import Transaction from "./transaction.model";

class TransactionService {
  transaction() {
    return Transaction;
  }
}

const transactionService = new TransactionService();
export default transactionService;
