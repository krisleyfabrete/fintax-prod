import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountDialog } from '@/components/accounts/AccountDialog';
import { AccountLimitBanner } from '@/components/accounts/AccountLimitBanner';
import { useAccounts, Account } from '@/hooks/useAccounts';
import { useSubscription } from '@/hooks/useSubscription';
import { useHasFamily } from '@/hooks/useFamily';
import { useUpgradeModal } from '@/components/subscription/UpgradeModal';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Wallet, Loader2 } from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function Accounts() {
  const hasFamily = useHasFamily();
  const { 
    accounts, 
    isLoading, 
    totalBalance,
    createAccount, 
    updateAccount, 
    deleteAccount,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAccounts();
  
  const { checkLimit } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();
  const canCreateAccount = checkLimit('maxAccounts', accounts.length);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const handleNewAccount = () => {
    if (!canCreateAccount) {
      showUpgradeModal('unlimited-accounts');
      return;
    }
    setSelectedAccount(null);
    setDialogOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteAccount.mutate(accountToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setAccountToDelete(null);
        },
      });
    }
  };

  const handleSave = (data: {
    name: string;
    type: Account['type'];
    balance: number;
    icon: string;
    color: string;
  }) => {
    if (selectedAccount) {
      updateAccount.mutate(
        { id: selectedAccount.id, ...data },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createAccount.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Contas</h1>
            <p className="text-muted-foreground">
              Gerencie suas contas bancárias e carteiras
            </p>
          </div>
          <Button onClick={handleNewAccount} className="gradient-primary text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nova conta
          </Button>
        </div>
        {/* Account Limit Banner */}
        <AccountLimitBanner currentCount={accounts.length} />

        {/* Total Balance Card */}
        <Card className="shadow-card border-0 bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center">
                <Wallet className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo total</p>
                <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <Card className="shadow-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma conta cadastrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione suas contas bancárias, cartões e carteiras para começar a controlar suas finanças.
              </p>
              <Button onClick={handleNewAccount} className="gradient-primary text-white">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeira conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
              />
            ))}
          </div>
        )}
      </div>

      {/* Account Dialog */}
      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
        hasFamily={hasFamily}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{accountToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
