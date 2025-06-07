use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

declare_id!("2yErQiMAVSgabTtYt9FJQY6sUyBX7P1R1N7i1m2ytRY3");

#[program]
pub mod rsa_storage {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn store_rsa_key(ctx: Context<StoreKey>, rsa_key: String) -> Result<()> {
        ctx.accounts.user_rsa.rsa_key = rsa_key;
        Ok(())
    }

    pub fn get_rsa_key(ctx: Context<GetKey>) -> Result<String> {
        Ok(ctx.accounts.user_rsa.rsa_key.clone())
    }

    pub fn store_file_metadata(
        ctx: Context<StoreFileMetadata>,
        cid: String,
        key_cid: String,
        is_public: bool,
    ) -> Result<()> {
        let metadata = &mut ctx.accounts.file_metadata;
        metadata.cid = cid;
        metadata.key_cid = key_cid;
        metadata.uploader = ctx.accounts.uploader.key();
        metadata.timestamp = Clock::get()?.unix_timestamp;
        metadata.is_public = is_public;
        Ok(())
    }

    pub fn share_file_access(
        ctx: Context<ShareFileAccess>,
        cid: String,
        shared_key_cid: String,
    ) -> Result<()> {
        let shared = &mut ctx.accounts.shared_access;
        shared.cid = cid;
        shared.shared_key_cid = shared_key_cid;
        shared.shared_by = ctx.accounts.sharer.key();
        shared.shared_with = ctx.accounts.shared_with.key();
        shared.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
#[instruction()]
pub struct StoreKey<'info> {
    #[account(
        init_if_needed,
        seeds = [b"user_rsa", user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 512
    )]
    pub user_rsa: Account<'info, UserRSAKey>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetKey<'info> {
    #[account(
        seeds = [b"user_rsa", user.key().as_ref()],
        bump,
    )]
    pub user_rsa: Account<'info, UserRSAKey>,

    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(cid: String)]
pub struct StoreFileMetadata<'info> {
    #[account(
        init_if_needed,
        seeds = [b"file_metadata", &keccak::hash(cid.as_bytes()).to_bytes()[..]],
        bump,
        payer = uploader,
        space = 8 + 128 + 128 + 32 + 8 + 1 // 128 bytes for Cid, 128 bytes for key cid
    )]
    pub file_metadata: Account<'info, FileMetadata>,

    #[account(mut)]
    pub uploader: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserRSAKey {
    pub rsa_key: String,
}

#[account]
pub struct FileMetadata {
    pub cid: String,      // IPFS CID
    pub key_cid: String,  // IPFS Aes key CID
    pub uploader: Pubkey, // who uploaded
    pub timestamp: i64,   // UNIX timestamp
    pub is_public: bool,  // access policy
}

#[account]
pub struct SharedAccess {
    pub cid: String,
    pub shared_key_cid: String,
    pub shared_by: Pubkey,
    pub shared_with: Pubkey,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction(cid: String)]
pub struct ShareFileAccess<'info> {
    #[account(mut)]
    pub sharer: Signer<'info>,

    /// CHECK: not dangerous; used for PDA seed
    pub shared_with: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [b"shared_access", &keccak::hash(cid.as_bytes()).to_bytes()[..], shared_with.key().as_ref()],
        bump,
        payer = sharer,
        space = 8 + 128 + 128 + 32 + 32 + 8
    )]
    pub shared_access: Account<'info, SharedAccess>,

    pub system_program: Program<'info, System>,
}
